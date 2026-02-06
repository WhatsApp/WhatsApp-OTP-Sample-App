import {NativeModules, Platform} from 'react-native';

interface WhatsAppOtpModuleInterface {
  initialize: () => void;
  sendHandshakeToWhatsApp: () => Promise<void>;
}

const LINKING_ERROR =
  'The WhatsAppOtpModule could not be found. This module is only available on Android.';

const NoopModule: WhatsAppOtpModuleInterface = {
  initialize: () => {
    console.log('WhatsAppOtpModule.initialize is only available on Android');
  },
  sendHandshakeToWhatsApp: async () => {
    console.log(
      'WhatsAppOtpModule.sendHandshakeToWhatsApp is only available on Android',
    );
  },
};

const WhatsAppOtpModule: WhatsAppOtpModuleInterface =
  Platform.OS === 'android'
    ? NativeModules.WhatsAppOtpModule ||
      new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        },
      )
    : NoopModule;

export default WhatsAppOtpModule;
