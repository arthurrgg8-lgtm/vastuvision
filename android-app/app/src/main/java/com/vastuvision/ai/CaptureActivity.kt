package com.vastuvision.ai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.vastuvision.ai.database.VastuDatabase
import com.vastuvision.ai.database.VastuAnalysisEntity
import com.vastuvision.ai.databinding.ActivityCaptureBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CaptureActivity : AppCompatActivity(), CompassHelper.CompassListener {

    private lateinit var binding: ActivityCaptureBinding
    private lateinit var compassHelper: CompassHelper
    private lateinit var cameraExecutor: ExecutorService

    private var imageCapture: ImageCapture? = null
    private var roomType: String = "unknown"
    
    // Captured images storage: direction to base64 string
    private val base64Images = mutableMapOf<String, String>()
    
    private val captureSteps = listOf("north", "south", "east", "west")
    private var currentStepIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCaptureBinding.inflate(layoutInflater)
        setContentView(binding.root)

        roomType = intent.getStringExtra("room_type") ?: "bedroom"
        cameraExecutor = Executors.newSingleThreadExecutor()
        compassHelper = CompassHelper(this, this)

        // 1. Request Camera Permissions
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS)
        }

        // 2. Setup button triggers
        binding.btnCapture.setOnClickListener { takePhoto() }
        binding.btnCancel.setOnClickListener { finish() }

        updateGuidanceUI()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.viewFinder.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
            } catch (exc: Exception) {
                Toast.makeText(this, "Failed to initialize camera viewfinder: ${exc.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        // Capture photo into memory
        imageCapture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(imageProxy: ImageProxy) {
                    val bitmap = imageProxyToBitmap(imageProxy)
                    imageProxy.close()

                    if (bitmap != null) {
                        // Compress and scale bitmap (max 800px)
                        val scaled = scaleBitmap(bitmap, 800)
                        val base64 = bitmapToBase64(scaled)
                        
                        val currentDir = captureSteps[currentStepIndex]
                        base64Images[currentDir] = base64

                        // Advance to next direction
                        if (currentStepIndex < captureSteps.size - 1) {
                            currentStepIndex++
                            updateGuidanceUI()
                        } else {
                            // Captured all 4 directions! Trigger analysis.
                            uploadAndAnalyze()
                        }
                    } else {
                        Toast.makeText(this@CaptureActivity, "Failed to parse captured image.", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Toast.makeText(this@CaptureActivity, "Failed to capture photo: ${exception.message}", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }

    private fun updateGuidanceUI() {
        val step = captureSteps[currentStepIndex].uppercase()
        binding.tvGuideHeader.text = "${currentStepIndex + 1}/4: Face $step Wall"

        val description = when(captureSteps[currentStepIndex]) {
            "north" -> "Stand in the center. Turn to face NORTH (0° Heading) and shoot the wall directly in front of you."
            "south" -> "Stand in the center. Turn to face SOUTH (180° Heading) and shoot the wall directly in front of you."
            "east" -> "Stand in the center. Turn to face EAST (90° Heading) and shoot the wall directly in front of you."
            "west" -> "Stand in the center. Turn to face WEST (270° Heading) and shoot the wall directly in front of you."
            else -> ""
        }
        binding.tvGuideDescription.text = description
    }

    override fun onCompassUpdate(azimuth: Float, direction: String) {
        val rounded = Math.round(azimuth)
        binding.tvCompassAzimuth.text = "$rounded°"
        binding.tvCompassDirection.text = " $direction"

        // Highlight compass text when correctly aligned with target direction
        val targetAngle = when(captureSteps[currentStepIndex]) {
            "north" -> 0
            "south" -> 180
            "east" -> 90
            "west" -> 270
            else -> 0
        }

        // Allow a margin of ±25 degrees for alignment feedback
        val diff = Math.abs((rounded - targetAngle + 360) % 360)
        val isAligned = diff <= 25 || diff >= 335
        
        if (isAligned) {
            binding.layoutCompass.setBackgroundColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
        } else {
            binding.layoutCompass.setBackgroundColor(0xA6000000.toInt())
        }
    }

    private fun uploadAndAnalyze() {
        // Show loading dialog overlay
        binding.layoutLoading.visibility = View.VISIBLE
        binding.btnCapture.isEnabled = false

        lifecycleScope.launch {
            try {
                // Call API proxy
                val resultsJson = NetworkClient.analyzeRoom(roomType, base64Images)
                
                // Parse score to save in local history
                val score = JSONObject(resultsJson).optInt("vastu_score", 100)

                // Save to Room DB in background thread
                withContext(Dispatchers.IO) {
                    VastuDatabase.getDatabase(this@CaptureActivity).vastuAnalysisDao().insertScan(
                        VastuAnalysisEntity(
                            roomType = roomType,
                            score = score,
                            timestamp = System.currentTimeMillis(),
                            rawJson = resultsJson
                        )
                    )
                }

                // Launch Results Activity
                val intent = Intent(this@CaptureActivity, ResultsActivity::class.java).apply {
                    putExtra("results_json", resultsJson)
                }
                startActivity(intent)
                finish()

            } catch (e: Exception) {
                // Reset loading UI
                binding.layoutLoading.visibility = View.GONE
                binding.btnCapture.isEnabled = true
                Toast.makeText(this@CaptureActivity, "Analysis Failed: ${e.message}", Toast.LENGTH_LONG).show()
                
                // Let user re-try final upload step
                currentStepIndex = 3
                updateGuidanceUI()
            }
        }
    }

    /* ==========================================================================
       Image Processing Helpers
       ========================================================================== */
    private fun imageProxyToBitmap(image: ImageProxy): Bitmap? {
        val buffer = image.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        
        // Correct rotation based on sensor orientation
        val rotationDegrees = image.imageInfo.rotationDegrees
        return if (rotationDegrees != 0) {
            val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
            Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        } else {
            bitmap
        }
    }

    private fun scaleBitmap(bitmap: Bitmap, maxDim: Int): Bitmap {
        if (bitmap.width <= maxDim && bitmap.height <= maxDim) return bitmap
        val ratio = Math.min(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height)
        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt(),
            (bitmap.height * ratio).toInt(),
            true
        )
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    /* ==========================================================================
       Permissions checks
       ========================================================================== */
    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
            } else {
                Toast.makeText(this, "Permissions not granted by the user.", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        compassHelper.start()
    }

    override fun onPause() {
        super.onPause()
        compassHelper.stop()
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }
}
