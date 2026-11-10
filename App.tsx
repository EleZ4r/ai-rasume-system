
import React, { useContext } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme as NavigationDefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import ResumeUpload from './src/screens/applicant/ResumeUpload';
import ResumeAnalysis from './src/screens/applicant/ResumeAnalysis';
import JobRecommendations from './src/screens/applicant/JobRecommendations';
import MockInterview from './src/screens/applicant/MockInterview';
import MockInterviews from './src/screens/admin/MockInterviews';
import AdminMockInterviewDetail from './src/screens/admin/MockInterviewDetail';
import JobManagement from './src/screens/admin/JobManagement';
import Dashboard from './src/screens/applicant/Dashboard';
import ApplicationUpdates from './src/screens/applicant/ApplicationUpdates';
import Login from './src/screens/auth/Login';
import Register from './src/screens/auth/Register';
import Profile from './src/screens/applicant/Profile';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { colors } from './src/constants/theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.accent,
  },
};
const paperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.ink,
  },
};

export default function App() {
  return (
    <AuthProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <AppRoutes />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { token, loading } = useContext(AuthContext);
  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /><Text style={{ marginTop: 12, color: colors.muted }}>Starting CareerCanvas...</Text></View>;
  }

  return (
    <Stack.Navigator>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Workspace" component={WorkspaceTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Dashboard" component={Dashboard} options={{ title: 'My resumes' }} />
          <Stack.Screen name="Upload" component={ResumeUpload} options={{ title: 'Upload resume' }} />
          <Stack.Screen name="ResumeAnalysis" component={ResumeAnalysis} options={{ title: 'Resume review', headerShown: false, headerBackTitle: 'Back' }} />
          <Stack.Screen name="JobRecommendations" component={JobRecommendations} options={{ title: 'Recommended jobs', headerShown: false }} />
          <Stack.Screen name="MockInterview" component={MockInterview} options={{ title: 'Mock interview', headerShown: false }} />
          <Stack.Screen name="AdminResumes" component={require('./src/screens/admin/Resumes').default} options={{ title: 'Admin - Resumes' }} />
          <Stack.Screen name="AdminResumeDetail" component={require('./src/screens/admin/ResumeDetail').default} options={{ title: 'Resume Detail' }} />
          <Stack.Screen name="AdminMockInterviews" component={MockInterviews} options={{ title: 'Mock interview reviews', headerShown: false }} />
          <Stack.Screen name="AdminInterviewDetail" component={AdminMockInterviewDetail} options={{ title: 'Interview review', headerShown: false }} />
          <Stack.Screen name="AdminJobs" component={JobManagement} options={{ title: 'Manage jobs', headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

function WorkspaceTabs() {
  const { user, logout } = useContext(AuthContext);
  const compact = useWindowDimensions().width < 420;
  if (user?.is_admin || user?.is_hr) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ minHeight: 72, paddingHorizontal: compact ? 14 : 22, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface }}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={user?.is_admin ? 'shield-checkmark-outline' : 'people-outline'} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 }}>{user?.is_admin ? 'ADMINISTRATOR' : 'HUMAN RESOURCES'}</Text>
              <Text style={{ color: colors.ink, fontSize: compact ? 12 : 14, fontWeight: '800', marginTop: 3, flexShrink: 1 }}>CareerCanvas review desk</Text>
            </View>
          </View>
          <Pressable onPress={() => logout()} accessibilityRole="button" accessibilityLabel="Sign out" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.background : colors.surface, borderRadius: 8 })}>
            <Ionicons name="log-out-outline" size={17} color={colors.muted} />
            <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '700' }}>Sign out</Text>
          </Pressable>
        </View>
        <Tabs.Navigator
          initialRouteName="InterviewReviews"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: '#8795a8',
            tabBarLabelStyle: { fontSize: compact ? 10 : 11, fontWeight: '700', marginBottom: 3 },
            tabBarStyle: { height: compact ? 64 : 68, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, elevation: 4 },
          }}
        >
          <Tabs.Screen name="InterviewReviews" component={MockInterviews} options={{ tabBarLabel: 'Interviews', tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" color={color} size={size} /> }} />
          <Tabs.Screen name="ResumeReviews" component={require('./src/screens/admin/Resumes').default} options={{ tabBarLabel: 'Resumes', tabBarIcon: ({ color, size }) => <Ionicons name="documents-outline" color={color} size={size} /> }} />
          <Tabs.Screen name="JobManagement" component={JobManagement} options={{ tabBarLabel: 'Jobs', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} />
        </Tabs.Navigator>
      </View>
    );
  }

  return (
    <Tabs.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8795a8',
        tabBarLabelStyle: { fontSize: compact ? 10 : 12, fontWeight: '700', marginBottom: 3 },
        tabBarStyle: { height: compact ? 66 : 72, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, elevation: 4 },
        tabBarIconStyle: { marginTop: 1 },
      }}
    >
      <Tabs.Screen name="Dashboard" component={Dashboard} options={{ tabBarLabel: 'My resumes', tabBarIcon: ({ color, size }) => <Ionicons name="documents-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="ApplicationUpdates" component={ApplicationUpdates} options={{ tabBarLabel: 'Updates', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="Upload" component={ResumeUpload} options={{ tabBarLabel: 'Upload resume', tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="Profile" component={Profile} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
    </Tabs.Navigator>
  );
}
