package com.whatsapp.otp.reactnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class OtpCodeReceiver : BroadcastReceiver() {

    companion object {
        private const val OTP_CODE_KEY = "code"
        private const val OTP_ERROR_KEY = "error"
        const val OTP_RETRIEVED_ACTION = "com.whatsapp.otp.OTP_RETRIEVED"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == OTP_RETRIEVED_ACTION) {
            val code = intent.getStringExtra(OTP_CODE_KEY)
            val error = intent.getStringExtra(OTP_ERROR_KEY)

            val internalIntent = Intent(WhatsAppCodeReceiverActivity.OTP_RETRIEVED_ACTION).apply {
                code?.let { putExtra(OTP_CODE_KEY, it) }
                error?.let { putExtra(OTP_ERROR_KEY, it) }
            }

            context?.sendBroadcast(internalIntent)
        }
    }
}
