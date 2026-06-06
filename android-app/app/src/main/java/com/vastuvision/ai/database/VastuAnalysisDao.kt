package com.vastuvision.ai.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface VastuAnalysisDao {
    @Query("SELECT * FROM vastu_scans ORDER BY timestamp DESC")
    suspend fun getAllScans(): List<VastuAnalysisEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(scan: VastuAnalysisEntity)

    @Query("DELETE FROM vastu_scans WHERE id = :id")
    suspend fun deleteScanById(id: Int)
}
