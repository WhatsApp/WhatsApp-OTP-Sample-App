# Sample App for Android

This is a Sample Application showing how to integrate with WhatsApp client to enable 1-tap "Autofill" functionality for one-time password (OTP).

## Prerequisites to run the sample application on the emulator with the Sample Server

1. Find your application hash signature (instructions below)
2. Create a message template which enables 1-tap "Autofill" functionality. This can be done using the OTP Sample Server or through [WhatsApp Manager](https://business.facebook.com/wa/manage/).
3. Start the OTP Sample Server.
4. Generate the application APK (preferably signed)
5. Install the generated APK on the emulator

Note: You can install the APK on your phone as well, but then you have to ensure that the OTP service domain is accessible by your phone. In order to do that, you have to provide an accessible domain or ip to the server in the property file located at *app/src/main/assets/config.properties*.

## App hash signature and templates

In order to create the template to work with one tap you need your Android application hash signature.

To get the app hash signature all you need to do is run the application and the hash signature should be printed on the screen. 

Remember that:

- the app signature is not guaranteed to be the same if you are not generating a signed apk. 
- if you generate an apk for the same app in different machines, the signature hash will be different 

Given that, it is recommended that you use a signed apk to test the application.

The class which retrieves the application signature is the _AppSignatureRetriever.java_

## Sample Application key references

The Sample Application currently provides one sample implementation for single tap autofill for one-time password messages.

The key reference files are the manifest.xml file, the _WaIntentHandler.java_ class, and the _WhatsAppCodeReceiverActivity.java_ class

### Manifest.xml

It defines the activity (for one tap messages) and the receiver (for zero tap messages) responsible for receiving the code from WhatsApp

    <activity
        android:name=".app.activity.WhatsAppCodeReceiverActivity"
        android:enabled="true"
        android:exported="true"
        android:launchMode="standard">
        <intent-filter>
            <action android:name="com.whatsapp.otp.OTP_RETRIEVED" />
        </intent-filter>
    </activity>


    <receiver
        android:name=".app.receiver.OtpCodeReceiver"
        android:enabled="true"
        android:exported="true">
        <intent-filter>
            <action android:name="com.whatsapp.otp.OTP_RETRIEVED" />
        </intent-filter>
    </receiver>

### Main Classes


- *WhatsAppCodeReceiverActivity.java*: This is the Activity responsible for receiving the code from WhatsApp when customer gets an autofill message.
- *OtpCodeReceiver.java*: This is the Activity responsible for receiving the code from WhatsApp when customer gets a zero tap message.
- *WaIntentHandler.java*: This is the class that has the code responsible for doing the handshake.

### Handshake

The handshake is a required step to get either one tap and zero tap behavior for incoming one time password messages.

To do the handshake this app uses the [WhatsApp-OTP-SDK which is available on Github](https://github.com/WhatsApp/WhatsApp-Android-OTP-SDK/)

Sending an intent to WhatsApp to do the handshake as described on the [Authentication templates document](https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates/) is as simple as:

```
WhatsAppOtpHandler whatsAppOtpHandler = new WhatsAppOtpHandler();
whatsAppOtpHandler.sendOtpIntentToWhatsApp(context);
```

This sends the handshake to bot the WhatsApp Consumer app and the WhatsApp Business app.

For additional details check the [SDK documentation](https://github.com/WhatsApp/WhatsApp-Android-OTP-SDK/).

## Opening the application on Android Studio

Simply import the project to Android Studio. Android Studio's recommended version is 2021.3.1.

## Running the App

Once you have generated the apk:

1. Install it on the emulator.
2. Start the application.
3. You will be prompted to input the phone number to receive the otp code. 

### Notes

- You MUST add the full phone number, including the country code.
- If you are using a test WABA, you MUST ensure the phone used for testing is added as a phone number you can send messages to. To do this you must:
  1. Go to: developers.facebook.com/apps/<YOUR APP ID>/whatsapp-business/wa-dev-console/?business_id=<YOUR BUSINESS ID>
  2. Select the dropdown on the "To" section on the "Send and receive messages" section.
  3. Click on "Manage phone number list"