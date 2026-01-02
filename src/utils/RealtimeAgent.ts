/**
 * OpenAI Realtime API WebRTC Connection Handler
 * Handles bidirectional audio streaming with JARVIS AI agent
 * Supports function calling for tool execution
 */

export type AgentState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface FunctionCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface RealtimeAgentCallbacks {
  onStateChange: (state: AgentState) => void;
  onTranscript: (text: string, role: 'user' | 'assistant') => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onFunctionCall?: (call: FunctionCall) => Promise<string>;
}

export class RealtimeAgent {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private localStream: MediaStream | null = null;
  private callbacks: RealtimeAgentCallbacks;
  private currentState: AgentState = 'idle';
  private isUserSpeaking = false;
  
  // Track function call arguments as they stream in
  private pendingFunctionCalls: Map<string, { name: string; arguments: string }> = new Map();

  constructor(callbacks: RealtimeAgentCallbacks) {
    this.callbacks = callbacks;
    this.audioEl = document.createElement('audio');
    this.audioEl.autoplay = true;
    
    // Handle audio play/pause for speaking state
    this.audioEl.onplay = () => {
      if (this.currentState !== 'speaking') {
        this.setState('speaking');
      }
    };
    
    this.audioEl.onpause = () => {
      if (this.currentState === 'speaking') {
        this.setState('listening');
      }
    };
  }

  private setState(state: AgentState) {
    this.currentState = state;
    this.callbacks.onStateChange(state);
  }

  async connect(clientSecret: string): Promise<void> {
    try {
      this.setState('connecting');
      console.log('[RealtimeAgent] Starting WebRTC connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Handle remote audio track
      this.pc.ontrack = (event) => {
        console.log('[RealtimeAgent] Received remote track:', event.track.kind);
        this.audioEl.srcObject = event.streams[0];
      };

      // Handle connection state changes
      this.pc.onconnectionstatechange = () => {
        console.log('[RealtimeAgent] Connection state:', this.pc?.connectionState);
        if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
          this.callbacks.onDisconnected();
          this.setState('idle');
        }
      };

      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Add local audio track
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });

      // Set up data channel for events
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      // Create offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      console.log('[RealtimeAgent] Sending SDP offer to OpenAI...');
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status} - ${errorText}`);
      }

      const answerSdp = await sdpResponse.text();
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log('[RealtimeAgent] WebRTC connection established');
      this.callbacks.onConnected();
      this.setState('listening');

    } catch (error) {
      console.error('[RealtimeAgent] Connection error:', error);
      this.callbacks.onError(error instanceof Error ? error.message : 'Connection failed');
      this.setState('error');
      throw error;
    }
  }

  private setupDataChannelHandlers() {
    if (!this.dc) return;

    this.dc.onopen = () => {
      console.log('[RealtimeAgent] Data channel opened');
    };

    this.dc.onclose = () => {
      console.log('[RealtimeAgent] Data channel closed');
    };

    this.dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleServerEvent(message);
      } catch (error) {
        console.error('[RealtimeAgent] Failed to parse message:', error);
      }
    };
  }

  private async handleServerEvent(event: any) {
    console.log('[RealtimeAgent] Event:', event.type);

    switch (event.type) {
      case 'session.created':
        console.log('[RealtimeAgent] Session created');
        break;

      case 'session.updated':
        console.log('[RealtimeAgent] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[RealtimeAgent] User started speaking');
        this.isUserSpeaking = true;
        // Interrupt agent if speaking (barge-in)
        if (this.currentState === 'speaking') {
          this.cancelCurrentResponse();
        }
        this.setState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[RealtimeAgent] User stopped speaking');
        this.isUserSpeaking = false;
        this.setState('thinking');
        break;

      case 'input_audio_buffer.committed':
        console.log('[RealtimeAgent] Audio buffer committed');
        break;

      case 'conversation.item.created':
        if (event.item?.role === 'user' && event.item?.content?.[0]?.transcript) {
          this.callbacks.onTranscript(event.item.content[0].transcript, 'user');
        }
        break;

      case 'response.created':
        console.log('[RealtimeAgent] Response started');
        this.setState('thinking');
        break;

      case 'response.audio_transcript.delta':
        // Partial transcript from assistant
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          this.callbacks.onTranscript(event.transcript, 'assistant');
        }
        break;

      case 'response.audio.delta':
        // Audio is streaming
        if (this.currentState !== 'speaking' && !this.isUserSpeaking) {
          this.setState('speaking');
        }
        break;

      case 'response.audio.done':
        console.log('[RealtimeAgent] Audio response complete');
        break;

      // Function call events
      case 'response.function_call_arguments.delta':
        // Stream function call arguments
        const itemId = event.item_id;
        const callId = event.call_id;
        if (!this.pendingFunctionCalls.has(callId)) {
          this.pendingFunctionCalls.set(callId, { name: '', arguments: '' });
        }
        const pending = this.pendingFunctionCalls.get(callId)!;
        pending.arguments += event.delta || '';
        break;

      case 'response.function_call_arguments.done':
        console.log('[RealtimeAgent] Function call complete:', event.name, event.arguments);
        await this.handleFunctionCall({
          call_id: event.call_id,
          name: event.name,
          arguments: event.arguments,
        });
        break;

      case 'response.output_item.added':
        // Track function call name when item is added
        if (event.item?.type === 'function_call') {
          const callId = event.item.call_id;
          if (!this.pendingFunctionCalls.has(callId)) {
            this.pendingFunctionCalls.set(callId, { name: event.item.name || '', arguments: '' });
          } else {
            this.pendingFunctionCalls.get(callId)!.name = event.item.name || '';
          }
        }
        break;

      case 'response.done':
        console.log('[RealtimeAgent] Response complete');
        if (!this.isUserSpeaking) {
          this.setState('listening');
        }
        break;

      case 'error':
        console.error('[RealtimeAgent] Server error:', event.error);
        this.callbacks.onError(event.error?.message || 'Unknown server error');
        break;

      default:
        // Handle other events as needed
        break;
    }
  }

  private async handleFunctionCall(call: FunctionCall) {
    console.log('[RealtimeAgent] Handling function call:', call.name);
    
    if (!this.callbacks.onFunctionCall) {
      console.warn('[RealtimeAgent] No function call handler registered');
      this.sendFunctionResult(call.call_id, JSON.stringify({ error: 'Function handler not available' }));
      return;
    }

    try {
      // Execute the function via callback
      const result = await this.callbacks.onFunctionCall(call);
      
      // Send result back to the model
      this.sendFunctionResult(call.call_id, result);
      
    } catch (error) {
      console.error('[RealtimeAgent] Function call error:', error);
      this.sendFunctionResult(call.call_id, JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
    
    // Clean up pending call
    this.pendingFunctionCalls.delete(call.call_id);
  }

  private sendFunctionResult(callId: string, result: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.error('[RealtimeAgent] Cannot send function result - data channel not ready');
      return;
    }

    console.log('[RealtimeAgent] Sending function result for call:', callId);

    // Create the function call output item
    const outputEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: result,
      },
    };

    this.dc.send(JSON.stringify(outputEvent));

    // Trigger model to respond with the function result
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  private cancelCurrentResponse() {
    if (this.dc?.readyState === 'open') {
      console.log('[RealtimeAgent] Cancelling current response (barge-in)');
      this.dc.send(JSON.stringify({
        type: 'response.cancel',
      }));
    }
  }

  sendTextMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    // Create conversation item
    const createEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    };

    this.dc.send(JSON.stringify(createEvent));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
    this.callbacks.onTranscript(text, 'user');
    this.setState('thinking');
  }

  disconnect() {
    console.log('[RealtimeAgent] Disconnecting...');

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.pendingFunctionCalls.clear();
    this.audioEl.srcObject = null;
    this.setState('idle');
    this.callbacks.onDisconnected();
  }

  getState(): AgentState {
    return this.currentState;
  }

  isConnected(): boolean {
    return this.pc?.connectionState === 'connected';
  }
}
