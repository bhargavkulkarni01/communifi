import React, {useEffect, useRef, useState} from 'react';
import {SafeAreaView, View, Text, Image, ImageBackground, TouchableOpacity, Platform, PermissionsAndroid} from 'react-native';
import {WebView} from 'react-native-webview';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Geolocation from '@react-native-community/geolocation';

const WEB_CLIENT_ID = '1001841170586-drt7bifsbc8jvores6pq4spesg52pl6d.apps.googleusercontent.com';
const HOST = 'localhost';
const USE_VITE = true; // true: hot reload from Vite, false: built UI from FastAPI
const DEV = `http://${HOST}:${USE_VITE ? 5173 : 8000}`;
const BASE = __DEV__ ? DEV : 'https://YOUR_DOMAIN';
const BLUE = '#1679B8';

GoogleSignin.configure({webClientId: WEB_CLIENT_ID});
Geolocation.setRNConfiguration({skipPermissionRequests: false, authorizationLevel: 'whenInUse'});
 
export default function App() {
  const [idToken, setIdToken] = useState(null);
  const [error, setError] = useState('');
  const webRef = useRef(null);
 
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    }
  }, []);
 
  // The web page asks for the position; the native side gets it (works on iOS and Android) and sends it back.
  const locate = async () => {
    const send = r => webRef.current?.injectJavaScript(`window.__onNativeLocation(${JSON.stringify(r)});true;`);
    try {
      if (Platform.OS === 'android') {
        const P = PermissionsAndroid.PERMISSIONS;
        const g = await PermissionsAndroid.requestMultiple([P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION]);
        if (g[P.ACCESS_FINE_LOCATION] !== 'granted' && g[P.ACCESS_COARSE_LOCATION] !== 'granted') return send({error: 'denied'});
      } else {
        await new Promise(done => Geolocation.requestAuthorization(done, done));
      }
      Geolocation.getCurrentPosition(
        p => send({lat: p.coords.latitude, lng: p.coords.longitude}),
        e => send({error: e.code === 1 ? 'denied' : 'unavailable'}),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    } catch (e) { send({error: 'unavailable'}); }
  };
 
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const r = await GoogleSignin.signIn();
      setIdToken(r.data?.idToken ?? r.idToken);
    } catch (e) {
      setError(e.message);
    }
  };
 
  if (!idToken) {
    return (
      <ImageBackground source={require('./assets/splash_bg.png')} resizeMode="cover" style={{flex: 1}}>
      <SafeAreaView style={{flex: 1, justifyContent: 'center', padding: 28}}>
        <View style={{alignItems: 'center', marginBottom: 40}}>
          <Image source={require('./assets/logo.png')} style={{width: 300, height: 239}} resizeMode="contain" />
          <Text style={{color: '#d6e8ff', marginTop: 14}}>Stronger Communities. Smarter Cities.</Text>
        </View>
        <TouchableOpacity onPress={signIn} style={{backgroundColor: '#16A66A', padding: 16, borderRadius: 10, alignItems: 'center'}}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signIn} style={{marginTop: 16, alignItems: 'center'}}>
          <Text style={{color: '#e6f0ff'}}>Already have an account? <Text style={{color: '#9be7d6', fontWeight: '700'}}>Log in</Text></Text>
        </TouchableOpacity>
        {!!error && <Text style={{color: '#c92f35', marginTop: 16, textAlign: 'center'}}>{error}</Text>}
      </SafeAreaView>
    </ImageBackground>
    );
  }
 
  return (
    <SafeAreaView style={{flex: 1}}>
      <WebView
        ref={webRef}
        source={{uri: `${BASE}/app/`}}
        injectedJavaScriptBeforeContentLoaded={`window.NATIVE_ID_TOKEN=${JSON.stringify(idToken)};true;`}
        onMessage={async e => {
          const m = JSON.parse(e.nativeEvent.data);
          if (m.type === 'logout') {
            await GoogleSignin.signOut();
            setIdToken(null);
          } else if (m.type === 'locate') locate();
        }}
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
      />
    </SafeAreaView>
  );
}
 
 