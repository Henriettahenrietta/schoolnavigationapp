import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import BuildingScreen from './src/screens/BuildingScreen';
import RoomScreen from './src/screens/RoomScreen';
import DirectionsScreen from './src/screens/DirectionsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

// Root of the mobile client. React Navigation handles moving between the
// home map, search, building directory, room detail, and directions screens,
// as described in the project's technology stack (client tier).
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: 'Search Campus' }}
          />
          <Stack.Screen
            name="Building"
            component={BuildingScreen}
            options={{ title: 'Building Directory' }}
          />
          <Stack.Screen
            name="Room"
            component={RoomScreen}
            options={{ title: 'Location Details' }}
          />
          <Stack.Screen
            name="Directions"
            component={DirectionsScreen}
            options={{ title: 'Directions' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
