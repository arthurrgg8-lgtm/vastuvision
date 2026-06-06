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

            // 0. Update UI Language
            val lang = NetworkClient.currentLanguage
            if (lang == "nepali") {
                binding.tvResultsHeader.text = "वास्तु सन्तुलन रिपोर्ट"
                binding.btnBackToMain.text = "बन्द गर्नुहोस्"
                binding.btnSubmitRefine.text = "सुधार गर्नुहोस्"
                binding.etRefineInput.hint = "सुधारहरू टाइप गर्नुहोस्: 'ओछ्यान हटाउनुहोस्'..."
                binding.tvHarmonyLabel.text = "सद्भाव"
                binding.tvGridCenter.text = "ब्रह्मस्थान"
            } else {
                binding.tvResultsHeader.text = "Vastu Harmony Report"
                binding.btnBackToMain.text = "Close"
                binding.btnSubmitRefine.text = "Refine"
                binding.etRefineInput.hint = "Type corrections: 'Remove bed'..."
                binding.tvHarmonyLabel.text = "HARMONY"
                binding.tvGridCenter.text = "Center"
            }

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

            val nPrefix = if (lang == "nepali") "उत्तर: " else "N: "
            val sPrefix = if (lang == "nepali") "दक्षिण: " else "S: "
            val ePrefix = if (lang == "nepali") "पूर्व: " else "E: "
            val wPrefix = if (lang == "nepali") "पश्चिम: " else "W: "

            binding.gridCellNorth.text = nPrefix + (directionsMap["north"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellSouth.text = sPrefix + (directionsMap["south"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellEast.text = ePrefix + (directionsMap["east"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")
            binding.gridCellWest.text = wPrefix + (directionsMap["west"]?.joinToString(", ")?.ifEmpty { "-" } ?: "-")

            // 3. Render RecyclerView Suggestions
            binding.rvSuggestions.adapter = SuggestionsAdapter(suggestionsList)

        } catch (e: Exception) {
            Toast.makeText(this, "Failed to display Vastu report: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun submitRefinement() {
        val lang = NetworkClient.currentLanguage
        val correction = binding.etRefineInput.text.toString().trim()
        if (correction.isEmpty()) {
            val emptyMsg = if (lang == "nepali") "कृपया पहिले सुधार विवरण टाइप गर्नुहोस्।" else "Please type a correction statement first."
            Toast.makeText(this, emptyMsg, Toast.LENGTH_SHORT).show()
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
                val successMsg = if (lang == "nepali") "वास्तु रिपोर्ट परिमार्जन भयो!" else "Vastu report refined!"
                Toast.makeText(this@ResultsActivity, successMsg, Toast.LENGTH_SHORT).show()

            } catch (e: Exception) {
                Toast.makeText(this@ResultsActivity, "Refinement Failed: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnSubmitRefine.isEnabled = true
                binding.etRefineInput.isEnabled = true
                binding.btnSubmitRefine.text = if (NetworkClient.currentLanguage == "nepali") "सुधार गर्नुहोस्" else "Refine"
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
            val lang = NetworkClient.currentLanguage

            binding.tvObjName.text = item.name
            
            val detectedText = if (lang == "nepali") "पत्ता लागेको" else "Detected"
            val idealText = if (lang == "nepali") "आदर्श" else "Ideal"
            binding.tvObjPosition.text = "$detectedText: ${item.detectedDir} | $idealText: ${item.vastuIdeal}"
            binding.tvReason.text = item.reason
            binding.tvRemedyText.text = item.remedy
            
            binding.tvRemedyLabel.text = if (lang == "nepali") "वास्तु उपाय" else "VASTU REMEDY"

            // Badge styling
            if (lang == "nepali") {
                when (item.status.lowercase()) {
                    "critical" -> {
                        binding.tvStatusBadge.text = "गम्भीर दोष"
                        binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#EF4444")) // Rose Red
                        binding.layoutRemedy.setBackgroundColor(Color.parseColor("#26EF4444")) // 15% opacity Rose
                    }
                    "warning" -> {
                        binding.tvStatusBadge.text = "चेतावनी"
                        binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#F59E0B")) // Amber Yellow
                        binding.layoutRemedy.setBackgroundColor(Color.parseColor("#26F59E0B")) // 15% opacity Amber
                    }
                    else -> {
                        binding.tvStatusBadge.text = "उत्तम"
                        binding.tvStatusBadge.setBackgroundColor(Color.parseColor("#10B981")) // Emerald Green
                        binding.layoutRemedy.setBackgroundColor(Color.parseColor("#2610B981")) // 15% opacity Emerald
                    }
                }
            } else {
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
        }

        override fun getItemCount() = items.size
    }
}
