package com.vastuvision.ai

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.vastuvision.ai.database.VastuDatabase
import com.vastuvision.ai.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val database by lazy { VastuDatabase.getDatabase(this) }
    private val roomTypes = listOf("bedroom", "kitchen", "living_room", "pooja_room", "bathroom")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // 1. Language toggles
        binding.tvLangEn.setOnClickListener {
            NetworkClient.currentLanguage = "english"
            updateUILanguage()
            loadHistory()
        }
        binding.tvLangNe.setOnClickListener {
            NetworkClient.currentLanguage = "nepali"
            updateUILanguage()
            loadHistory()
        }

        // Setup initial language
        updateUILanguage()

        // 2. Setup History RecyclerView
        binding.rvHistory.layoutManager = LinearLayoutManager(this)

        // 3. Start Button
        binding.btnStartScan.setOnClickListener {
            val selectedIndex = binding.spinnerRoomType.selectedItemPosition
            if (selectedIndex != -1) {
                val roomType = roomTypes[selectedIndex]
                val intent = Intent(this, CaptureActivity::class.java).apply {
                    putExtra("room_type", roomType)
                }
                startActivity(intent)
            }
        }
    }

    private fun getRoomDisplayName(room: String, lang: String): String {
        return if (lang == "nepali") {
            when (room) {
                "bedroom" -> "सुत्ने कोठा (Bedroom)"
                "kitchen" -> "भान्सा कोठा (Kitchen)"
                "living_room" -> "बैठक कोठा (Living Room)"
                "pooja_room" -> "पूजा कोठा (Pooja Room)"
                "bathroom" -> "शौचालय (Bathroom)"
                else -> room
            }
        } else {
            room.replace("_", " ").replaceFirstChar { char -> char.uppercase() }
        }
    }

    private fun updateUILanguage() {
        val lang = NetworkClient.currentLanguage
        if (lang == "nepali") {
            binding.tvAppTitle.text = "वास्तुभिजन AI"
            binding.tvAppSubtitle.text = "स्मार्ट कोठा विश्लेषण र सद्भाव गाइड"
            binding.tvSelectTitle.text = "१. कोठाको प्रकार चयन गर्नुहोस्"
            binding.btnStartScan.text = "स्क्यान सुरु गर्नुहोस्"
            binding.tvHistoryTitle.text = "वास्तु स्क्यान इतिहास"
            
            binding.tvLangNe.setBackgroundResource(R.drawable.bg_language_selected)
            binding.tvLangNe.setTextColor(Color.WHITE)
            binding.tvLangEn.setBackgroundColor(Color.TRANSPARENT)
            binding.tvLangEn.setTextColor(Color.parseColor("#7B829A"))
        } else {
            binding.tvAppTitle.text = "VastuVision AI"
            binding.tvAppSubtitle.text = "Smart Vastu Shastra Room Analysis"
            binding.tvSelectTitle.text = "1. Choose Room Type"
            binding.btnStartScan.text = "Start Guided Scan"
            binding.tvHistoryTitle.text = "Vastu Scan History"
            
            binding.tvLangEn.setBackgroundResource(R.drawable.bg_language_selected)
            binding.tvLangEn.setTextColor(Color.WHITE)
            binding.tvLangNe.setBackgroundColor(Color.TRANSPARENT)
            binding.tvLangNe.setTextColor(Color.parseColor("#7B829A"))
        }

        // Re-populate Spinner
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, roomTypes.map {
            getRoomDisplayName(it, lang)
        })
        binding.spinnerRoomType.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
        loadHistory()
    }

    private fun loadHistory() {
        lifecycleScope.launch {
            try {
                val scans = withContext(Dispatchers.IO) {
                    database.vastuAnalysisDao().getAllScans()
                }
                
                binding.rvHistory.adapter = object : RecyclerViewAdapter(scans) {
                    override fun onItemClick(json: String) {
                        val intent = Intent(this@MainActivity, ResultsActivity::class.java).apply {
                            putExtra("results_json", json)
                        }
                        startActivity(intent)
                    }
                }

            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Failed to load history: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Direct inline RecyclerView Adapter to avoid extra adapter class files
    inner abstract class RecyclerViewAdapter(private val list: List<com.vastuvision.ai.database.VastuAnalysisEntity>) : 
        androidx.recyclerview.widget.RecyclerView.Adapter<RecyclerViewAdapter.ViewHolder>() {
        
        abstract fun onItemClick(json: String)

        inner class ViewHolder(val view: android.view.View) : androidx.recyclerview.widget.RecyclerView.ViewHolder(view) {
            val text1: android.widget.TextView = view.findViewById(android.R.id.text1)
            val text2: android.widget.TextView = view.findViewById(android.R.id.text2)
        }

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): ViewHolder {
            val inflater = android.view.LayoutInflater.from(parent.context)
            val v = inflater.inflate(android.R.layout.simple_list_item_2, parent, false)
            return ViewHolder(v)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = list[position]
            val date = java.text.DateFormat.getDateTimeInstance().format(java.util.Date(item.timestamp))
            val lang = NetworkClient.currentLanguage
            
            val roomName = getRoomDisplayName(item.roomType, lang).uppercase()
            val scoreText = if (lang == "nepali") "सद्भाव स्कोर: ${item.score}%" else "Harmony Score: ${item.score}%"
            val savedText = if (lang == "nepali") "बचत गरिएको मिति: $date" else "Saved: $date"

            holder.text1.text = "$roomName — $scoreText"
            holder.text1.setTextColor(android.graphics.Color.WHITE)
            
            holder.text2.text = savedText
            holder.text2.setTextColor(android.graphics.Color.GRAY)
            
            holder.view.setOnClickListener {
                onItemClick(item.rawJson)
            }
        }

        override fun getItemCount() = list.size
    }
}
