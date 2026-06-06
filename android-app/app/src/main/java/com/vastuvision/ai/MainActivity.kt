package com.vastuvision.ai

import android.content.Intent
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // 1. Setup Room Selector Spinner
        val roomTypes = listOf("bedroom", "kitchen", "living_room", "pooja_room", "bathroom")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, roomTypes.map {
            it.replace("_", " ").replaceFirstChar { char -> char.uppercase() }
        })
        binding.spinnerRoomType.adapter = adapter

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
                
                // Set simple history list items
                val historyAdapter = ArrayAdapter(
                    this@MainActivity,
                    android.R.layout.simple_list_item_2,
                    android.R.id.text1,
                    scans.map {
                        val date = java.text.DateFormat.getDateTimeInstance().format(java.util.Date(it.timestamp))
                        "${it.roomType.uppercase()} — Score: ${it.score}\nAnalyzed on: $date"
                    }
                )
                
                // Fallback direct list adapter
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
    abstract class RecyclerViewAdapter(private val list: List<com.vastuvision.ai.database.VastuAnalysisEntity>) : 
        androidx.recyclerview.widget.RecyclerView.Adapter<RecyclerViewAdapter.ViewHolder>() {
        
        abstract fun onItemClick(json: String)

        class ViewHolder(val view: android.view.View) : androidx.recyclerview.widget.RecyclerView.ViewHolder(view) {
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
            
            holder.text1.text = "${item.roomType.replace("_", " ").uppercase()} — Harmony Score: ${item.score}%"
            holder.text1.setTextColor(android.graphics.Color.WHITE)
            
            holder.text2.text = "Saved: $date"
            holder.text2.setTextColor(android.graphics.Color.GRAY)
            
            holder.view.setOnClickListener {
                onItemClick(item.rawJson)
            }
        }

        override fun getItemCount() = list.size
    }
}
