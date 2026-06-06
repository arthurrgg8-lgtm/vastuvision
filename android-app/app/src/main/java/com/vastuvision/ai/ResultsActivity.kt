package com.vastuvision.ai

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.vastuvision.ai.database.VastuDatabase
import com.vastuvision.ai.database.VastuAnalysisEntity
import com.vastuvision.ai.databinding.ActivityResultsBinding
import com.vastuvision.ai.databinding.ItemSuggestionBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class ResultsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityResultsBinding
    private var rawJsonString: String = ""
    private var roomType: String = "unknown"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResultsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        rawJsonString = intent.getStringExtra("results_json") ?: ""
        
        binding.rvSuggestions.layoutManager = LinearLayoutManager(this)
        binding.btnBackToMain.setOnClickListener {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            finish()
        }

        binding.btnSubmitRefine.setOnClickListener { submitRefinement() }

        parseAndDisplayReport()
    }

    private fun parseAndDisplayReport() {
        if (rawJsonString.isEmpty()) return

        try {
            val json = JSONObject(rawJsonString)
            roomType = json.optString("room_type", "bedroom")
            val score = json.optInt("vastu_score", 100)
            val objectsArray = json.optJSONArray("objects") ?: JSONArray()

            // 1. Render Score
            binding.tvScoreVal.text = score.toString()
            when {
                score >= 85 -> binding.tvScoreVal.setTextColor(Color.parseColor("#10B981")) // Emerald Green
                score >= 60 -> binding.tvScoreVal.setTextColor(Color.parseColor("#F59E0B")) // Amber Yellow
                else -> binding.tvScoreVal.setTextColor(Color.parseColor("#EF4444")) // Rose Red
            }

            // 2. Clear & Populate 2D Floorplan Grid cells
            val directionsMap = mutableMapOf(
                "north" to mutableListOf<String>(),
                "south" to mutableListOf<String>(),
                "east" to mutableListOf<String>(),
                "west" to mutableListOf<String>()
            )

            val suggestionsList = mutableListOf<SuggestionItem>()

            for (i in 0 until objectsArray.length()) {
                val obj = objectsArray.getJSONObject(i)
                val name = obj.optString("name", "Unknown Item")
                val detectedDir = obj.optString("detected_direction", "North")
                val vastuIdeal = obj.optString("vastu_ideal", "South")
                val status = obj.optString("status", "good")
                val reason = obj.optString("reason", "")
                val suggestion = obj.optString("suggestion", "")

                suggestionsList.add(SuggestionItem(name, detectedDir, vastuIdeal, status, reason, suggestion))

                val dirLower = detectedDir.lowercase()
                when {
                    dirLower.contains("north") -> directionsMap["north"]?.add(name)
                    dirLower.contains("south") -> directionsMap["south"]?.add(name)
                    dirLower.contains("east") -> directionsMap["east"]?.add(name)
                    dirLower.contains("west") -> directionsMap["west"]?.add(name)
                }
            }

            binding.gridCellNorth.text = "N: " + (directionsMap["north"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellSouth.text = "S: " + (directionsMap["south"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellEast.text = "E: " + (directionsMap["east"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellWest.text = "W: " + (directionsMap["west"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")

            // 3. Render RecyclerView Suggestions
            binding.rvSuggestions.adapter = SuggestionsAdapter(suggestionsList)

        } catch (e: Exception) {
            Toast.makeText(this, "Failed to display Vastu report: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun submitRefinement() {
        val correction = binding.etRefineInput.text.toString().trim()
        if (correction.isEmpty()) {
            Toast.makeText(this, "Please type a correction statement first.", Toast.LENGTH_SHORT).show()
            return
        }

        // Disable input views during refinement
        binding.btnSubmitRefine.isEnabled = false
        binding.etRefineInput.isEnabled = false
        binding.btnSubmitRefine.text = "..."

        lifecycleScope.launch {
            try {
                // Call HTTP client refinement endpoint
                val updatedJson = NetworkClient.refineLayout(roomType, rawJsonString, correction)
                
                // Update local storage representation
                rawJsonString = updatedJson
                binding.etRefineInput.setText("")
                
                // Parse updated score
                val newScore = JSONObject(updatedJson).optInt("vastu_score", 100)

                // Save refined scan results to local DB in background
                withContext(Dispatchers.IO) {
                    VastuDatabase.getDatabase(this@ResultsActivity).vastuAnalysisDao().insertScan(
                        VastuAnalysisEntity(
                            roomType = roomType,
                            score = newScore,
                            timestamp = System.currentTimeMillis(),
                            rawJson = updatedJson
                        )
                    )
                }

                // Refresh Layout
                parseAndDisplayReport()
                Toast.makeText(this@ResultsActivity, "Vastu report refined!", Toast.LENGTH_SHORT).show()

            } catch (e: Exception) {
                Toast.makeText(this@ResultsActivity, "Refinement Failed: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnSubmitRefine.isEnabled = true
                binding.etRefineInput.isEnabled = true
                binding.btnSubmitRefine.text = "Refine"
            }
        }
    }

    /* ==========================================================================
       RecyclerView Adapter Implementation
       ========================================================================== */
    data class SuggestionItem(
        val name: String,
        val detectedDir: String,
        val vastuIdeal: String,
        val status: String,
        val reason: String,
        val remedy: String
    )

    class SuggestionsAdapter(private val items: List<SuggestionItem>) : 
        RecyclerView.Adapter<SuggestionsAdapter.ViewHolder>() {

        class ViewHolder(val binding: ItemSuggestionBinding) : RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val binding = ItemSuggestionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            return ViewHolder(binding)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]
            val binding = holder.binding

            binding.tvObjName.text = item.name
            binding.tvObjPosition.text = "Detected: ${item.detectedDir} | Ideal: ${item.vastuIdeal}"
            binding.tvReason.text = item.reason
            binding.tvRemedyText.text = item.remedy

            // Badge styling
            binding.tvStatusBadge.text = item.status.uppercase()
            when (item.status.lowercase()) {
                "critical" -> {
                    binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#EF4444")) // Rose Red
                    binding.layoutRemedy.setBackgroundColor(Color.parseColor("#26EF4444")) // 15% opacity Rose
                }
                "warning" -> {
                    binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#F59E0B")) // Amber Yellow
                    binding.layoutRemedy.setBackgroundColor(Color.parseColor("#26F59E0B")) // 15% opacity Amber
                }
                else -> {
                    binding.tvStatusBadge.text = "OPTIMAL"
                    binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#10B981")) // Emerald Green
                    binding.layoutRemedy.setBackgroundColor(Color.parseColor("#2610B981")) // 15% opacity Emerald
                }
            }
        }

        override fun getItemCount() = items.size
    }
}
