import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000814" />
      <View style={styles.webviewWrapper}>
        <WebView 
          source={{ uri: 'http://192.168.100.9:3000' }} 
          style={styles.webview}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          overScrollMode="never"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000814',
  },
  webviewWrapper: {
    flex: 1,
    // Add negative margin to hide white edges if any
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000814',
  },
});
