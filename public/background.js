// JARVIS Background Runner Script
// This script runs in the background to check for routine notifications

addEventListener('checkRoutines', async (event) => {
  console.log('[JARVIS Background] Checking routines...');
  
  try {
    // Get current time
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Send a notification reminder
    await CapacitorNotifications.schedule([
      {
        id: Math.floor(Math.random() * 10000),
        title: 'JARVIS',
        body: `Verificação de rotinas às ${currentTime}`,
        schedule: { at: new Date(Date.now() + 1000) }
      }
    ]);
    
    console.log('[JARVIS Background] Routine check completed');
  } catch (error) {
    console.error('[JARVIS Background] Error:', error);
  }
});

addEventListener('fetch', (event) => {
  console.log('[JARVIS Background] Fetch event received');
});
