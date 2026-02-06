package com.whatsapp.otp.reactnative

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class WhatsAppCodeReceiverActivity : Activity() {

    companion object {
        private const val OTP_CODE_KEY = "code"
        private const val OTP_ERROR_KEY = "error"
        const val OTP_RETRIEVED_ACTION = "com.whatsapp.otp.OTP_RETRIEVED_INTERNAL"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val code = intent.getStringExtra(OTP_CODE_KEY)
        val error = intent.getStringExtra(OTP_ERROR_KEY)

        val broadcastIntent = Intent(OTP_RETRIEVED_ACTION).apply {
            code?.let { putExtra(OTP_CODE_KEY, it) }
            error?.let { putExtra(OTP_ERROR_KEY, it) }
        }

        sendBroadcast(broadcastIntent)
        finish()
    }
}
