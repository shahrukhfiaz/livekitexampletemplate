import { SipClient } from 'livekit-server-sdk';
import { verifyEnv } from './env.js';

async function main() {
  const { 
    LIVEKIT_API_KEY, 
    LIVEKIT_API_SECRET, 
    LIVEKIT_URL, 
    TWILIO_PHONE_NUMBER 
  } = verifyEnv([
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'LIVEKIT_URL',
    'TWILIO_PHONE_NUMBER',
  ]);

  const targetPhoneNumber = process.argv[2];
  const outboundSipTrunkId = process.argv[3];

  if (!targetPhoneNumber) {
    console.error('Usage: npm run call:outbound <target-phone-number> [outbound-sip-trunk-id]');
    console.error('Please provide the phone number to call as the first argument.');
    process.exit(1);
  }

  if (!outboundSipTrunkId) {
    console.warn('Warning: Outbound SIP Trunk ID not provided as the second argument.');
    console.warn('The call might fail if LiveKit cannot determine which SIP trunk to use for outbound calls, or if a default is not configured.');
    // You might want to exit here if an outboundSipTrunkId is strictly required
    // process.exit(1);
  }

  console.log(`Attempting to call ${targetPhoneNumber} from ${TWILIO_PHONE_NUMBER} using SIP trunk ${outboundSipTrunkId || 'default/auto-selected'}`);

  const sipClient = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

  const roomName = `sip-outbound-${Date.now()}`;
  const participantIdentity = `sip-caller-${targetPhoneNumber.replace(/[^0-9a-zA-Z_-]/g, '')}`;

  if (!TWILIO_PHONE_NUMBER) {
    console.error('Error: TWILIO_PHONE_NUMBER is not set in your .env.local file. This is required for the caller ID.');
    process.exit(1);
  }
  if (!outboundSipTrunkId) {
    console.error('Error: Outbound SIP Trunk ID is required to make a call.');
    process.exit(1);
  }

  console.log(`Call will be placed in room: ${roomName}, with participant identity: ${participantIdentity}`);

  try {
    const result = await sipClient.createSipParticipant(
      outboundSipTrunkId,       // First argument: sip_trunk_id
      targetPhoneNumber,        // Second argument: sip_call_to (callee)
      roomName,                 // Third argument: room_name
      {                         // Fourth argument: options object
        participantIdentity: participantIdentity,
        participantName: participantIdentity, // Using the generated identity as name for now
        fromNumber: TWILIO_PHONE_NUMBER,    // Optional SIP From number to use. If empty, trunk number is used.
        // metadata: undefined, // Optional
        // waitUntilAnswered: true, // Optional, if supported. Check SDK docs.
      }
    );
    console.log('Outbound call initiated successfully:');
    console.log('  Raw result from createSipParticipant:', JSON.stringify(result, null, 2));
    console.log('  Room Name for agent to join:', roomName);
    // Attempt to access common properties, names might vary based on SDK version
    // These are guesses based on typical proto to JS/TS conversions
    if (result && typeof result === 'object') {
      if ('participantIdentity' in result) {
        console.log('  Participant Identity in room (from result.participantIdentity):', (result as any).participantIdentity);
      } else if ('identity' in result) {
        console.log('  Participant Identity in room (from result.identity):', (result as any).identity);
      }
      if ('participantName' in result) {
        console.log('  Participant Name in room (from result.participantName):', (result as any).participantName);
      } else if ('name' in result) {
        console.log('  Participant Name in room (from result.name):', (result as any).name);
      }
    } else {
      console.log('  Result from createSipParticipant is not an object or is null.');
    }
  } catch (error) {
    console.error('Failed to initiate outbound call:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      const e = error as any;
      if (e.code) console.error('Error code:', e.code);
      if (e.status) console.error('Error status:', e.status);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
