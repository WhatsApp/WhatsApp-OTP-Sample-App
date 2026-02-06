import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {verifyOtp} from '../services/OtpService';

type VerifyOtpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VerifyOtp'
>;

type VerifyOtpScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOtp'>;

type Props = {
  navigation: VerifyOtpScreenNavigationProp;
  route: VerifyOtpScreenRouteProp;
};

const MAX_OTP_LENGTH = 6;

function VerifyOtpScreen({navigation, route}: Props): React.JSX.Element {
  const {phoneNumber} = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.WhatsAppOtpModule) {
      const eventEmitter = new NativeEventEmitter(
        NativeModules.WhatsAppOtpModule,
      );

      const otpReceivedSubscription = eventEmitter.addListener(
        'onOtpReceived',
        (event: {code: string}) => {
          if (event.code) {
            setCode(event.code);
          }
        },
      );

      const otpErrorSubscription = eventEmitter.addListener(
        'onOtpError',
        (event: {error: string}) => {
          console.log('OTP Error:', event.error);
        },
      );

      return () => {
        otpReceivedSubscription.remove();
        otpErrorSubscription.remove();
      };
    }
  }, []);

  const handleCodeChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    if (numericOnly.length <= MAX_OTP_LENGTH) {
      setCode(numericOnly);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      const numericOnly = clipboardContent.replace(/[^0-9]/g, '');
      if (numericOnly.length >= MAX_OTP_LENGTH) {
        setCode(numericOnly.substring(0, MAX_OTP_LENGTH));
      } else if (numericOnly.length > 0) {
        setCode(numericOnly);
      } else {
        Alert.alert('Error', 'No valid code found in clipboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read clipboard');
    }
  };

  const handleVerify = async () => {
    if (code.length !== MAX_OTP_LENGTH) {
      Alert.alert('Error', `Please enter a ${MAX_OTP_LENGTH}-digit code`);
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(phoneNumber, code);
      if (result.success) {
        Alert.alert('Success', 'OTP verified successfully!', [
          {text: 'OK', onPress: () => navigation.popToTop()},
        ]);
      } else {
        Alert.alert('Error', result.error || 'Invalid OTP code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.subtitle}>
        We sent a {MAX_OTP_LENGTH}-digit code to {phoneNumber}
      </Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={handleCodeChange}
        keyboardType="number-pad"
        maxLength={MAX_OTP_LENGTH}
        placeholder="000000"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        textAlign="center"
        autoFocus
      />

      <TouchableOpacity
        style={styles.pasteButton}
        onPress={handlePasteFromClipboard}>
        <Text style={styles.pasteButtonText}>Paste from clipboard</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#25D366" />
      ) : (
        <TouchableOpacity
          style={[
            styles.verifyButton,
            code.length !== MAX_OTP_LENGTH && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={code.length !== MAX_OTP_LENGTH}>
          <Text style={styles.verifyButtonText}>Verify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  codeInput: {
    height: 60,
    borderWidth: 2,
    borderColor: '#25D366',
    borderRadius: 12,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 16,
  },
  pasteButton: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  pasteButtonText: {
    color: '#25D366',
    fontSize: 16,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#25D366',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default VerifyOtpScreen;
