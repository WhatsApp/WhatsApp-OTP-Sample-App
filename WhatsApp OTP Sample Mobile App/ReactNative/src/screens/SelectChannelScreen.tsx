import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {requestOtp} from '../services/OtpService';
import WhatsAppOtpModule from '../native/WhatsAppOtpModule';

type SelectChannelScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SelectChannel'
>;

type SelectChannelScreenRouteProp = RouteProp<
  RootStackParamList,
  'SelectChannel'
>;

type Props = {
  navigation: SelectChannelScreenNavigationProp;
  route: SelectChannelScreenRouteProp;
};

function SelectChannelScreen({navigation, route}: Props): React.JSX.Element {
  const {phoneNumber} = route.params;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      WhatsAppOtpModule.initialize();
    }
  }, []);

  const handleWhatsAppOtp = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        await WhatsAppOtpModule.sendHandshakeToWhatsApp();
      }

      const result = await requestOtp(phoneNumber);
      if (result.success) {
        navigation.navigate('VerifyOtp', {phoneNumber});
      } else {
        Alert.alert('Error', result.error || 'Failed to request OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request OTP via WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsOtp = async () => {
    setLoading(true);
    try {
      const result = await requestOtp(phoneNumber);
      if (result.success) {
        navigation.navigate('VerifyOtp', {phoneNumber});
      } else {
        Alert.alert('Error', result.error || 'Failed to request OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request OTP via SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose how to receive your code</Text>
      <Text style={styles.phoneLabel}>Phone: {phoneNumber}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#25D366" />
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleWhatsAppOtp}>
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>WA</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>WhatsApp</Text>
              <Text style={styles.optionDescription}>
                Receive code via WhatsApp message
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={handleSmsOtp}>
            <View style={[styles.optionIcon, styles.smsIcon]}>
              <Text style={styles.optionIconText}>SMS</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>SMS</Text>
              <Text style={styles.optionDescription}>
                Receive code via text message
              </Text>
            </View>
          </TouchableOpacity>
        </View>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  smsIcon: {
    backgroundColor: '#007AFF',
  },
  optionIconText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default SelectChannelScreen;
