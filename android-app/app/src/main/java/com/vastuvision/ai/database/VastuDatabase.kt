package com.vastuvision.ai.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [VastuAnalysisEntity::class], version = 1, exportSchema = false)
abstract class VastuDatabase : RoomDatabase() {

    abstract fun vastuAnalysisDao(): VastuAnalysisDao

    companion object {
        @Volatile
        private var INSTANCE: VastuDatabase? = null

        fun getDatabase(context: Context): VastuDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    VastuDatabase::class.java,
                    "vastu_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
