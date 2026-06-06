package com.vastuvision.ai.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "vastu_scans")
data class VastuAnalysisEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val roomType: String,
    val score: Int,
    val timestamp: Long,
    val rawJson: String
)
