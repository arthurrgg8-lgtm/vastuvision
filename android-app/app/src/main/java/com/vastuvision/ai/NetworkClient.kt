package com.vastuvision.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object NetworkClient {

    // Production Vercel deployment URL
    private const val BASE_URL = "https://vastuvision-beta.vercel.app"
    private const val ANALYZE_ENDPOINT = "$BASE_URL/api/analyze"
    private const val TIMEOUT = 45_000

    /**
     * Send 4 base64 encoded images to the server for Vastu Shastra analysis.
     */
    suspend fun analyzeRoom(roomType: String, base64Images: Map<String, String>): String = withContext(Dispatchers.IO) {
        val url = URL(ANALYZE_ENDPOINT)
        val conn = url.openConnection() as HttpURLConnection
        
        val payload = JSONObject().apply {
            put("room_type", roomType)
            put("images", JSONObject().apply {
                base64Images.forEach { (dir, b64) ->
                    put(dir, b64)
                }
            })
        }

        executePost(conn, payload.toString())
    }

    /**
     * Send correction text along with the previous analysis result to refine Vastu suggestions.
     */
    suspend fun refineLayout(roomType: String, previousAnalysisJson: String, correction: String): String = withContext(Dispatchers.IO) {
        val url = URL(ANALYZE_ENDPOINT)
        val conn = url.openConnection() as HttpURLConnection
        
        val payload = JSONObject().apply {
            put("room_type", roomType)
            put("previous_analysis", JSONObject(previousAnalysisJson))
            put("correction", correction)
        }

        executePost(conn, payload.toString())
    }

    private fun executePost(conn: HttpURLConnection, jsonBody: String): String {
        conn.apply {
            requestMethod = "POST"
            connectTimeout = TIMEOUT
            readTimeout = TIMEOUT
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)")
            setRequestProperty("ngrok-skip-browser-warning", "bypass")
        }

        OutputStreamWriter(conn.outputStream).use { it.write(jsonBody) }

        val responseCode = conn.responseCode
        if (responseCode == HttpURLConnection.HTTP_OK) {
            return conn.inputStream.bufferedReader().use { it.readText() }
        } else {
            val errorBody = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error message"
            throw Exception("API Error ($responseCode): $errorBody")
        }
    }
}
