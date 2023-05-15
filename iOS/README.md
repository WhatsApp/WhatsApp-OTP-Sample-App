# WhatsApp OTP Sample App (iOS)

A sample app integrating the WhatsApp OTP feature. 

*Please note: This project only includes Copy Code feature, One Tap is not available yet in iOS.*

## Request OTP via Sample Server

### Setup Sample Server
Follow [the instruction](https://github.com/WhatsApp/WhatsApp-OTP-Sample-App/Server/README.md) to setup and run Sample Server locally.

### Setup developer environment
1. Clone this repository
2. Open project in Xcode
3. Open ./SampleApp/OTP/OtpRequestUrl.swift, edit `host` and change `127.0.0.1` to the IP address of the machine which running the Sample Server
4. Build and run the app
    - If you build the app in real device, you would need an [Apple Developer account](https://developer.apple.com/)

## Test OTP
1. Download WhatsApp from [App Store](https://apps.apple.com/us/app/whatsapp-messenger/id310633997)
    - The minimum version of supporting OTP is from 2.22.11
2. Make sure notification is enabled in device level for WhatsApp, as well as the notification is enabled in WhatsApp Settings
2. Launch Sample App that was built
3. Enter the phone number you logged in WhatsApp with any random password
4. If everything was setup correctly, you should receive an OTP code from WhatsApp soon, copy and paste the code to verify

### Demo Video
![](sample_app_demo.mp4)
