import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SelectChannelScreen from '../screens/SelectChannelScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';

export type RootStackParamList = {
  Login: undefined;
  SelectChannel: {phoneNumber: string};
  VerifyOtp: {phoneNumber: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#25D366',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{title: 'Login'}}
      />
      <Stack.Screen
        name="SelectChannel"
        component={SelectChannelScreen}
        options={{title: 'Select OTP Channel'}}
      />
      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{title: 'Verify OTP'}}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;
