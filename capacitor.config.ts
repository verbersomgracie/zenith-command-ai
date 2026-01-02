import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7386de69b65b41098d281cecb8e47e30',
  appName: 'JARVIS',
  webDir: 'dist',
  server: {
    url: 'https://7386de69-b65b-4109-8d28-1cecb8e47e30.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#00D4FF',
      sound: 'beep.wav'
    },
    BackgroundRunner: {
      label: 'app.lovable.jarvis.background',
      src: 'background.js',
      event: 'checkRoutines',
      repeat: true,
      interval: 15,
      autoStart: true
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A0F1C'
  },
  ios: {
    backgroundColor: '#0A0F1C'
  }
};

export default config;
