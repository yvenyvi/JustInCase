const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wubznedcvolfmdhtcbgh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnpuZWRjdm9sZm1kaHRjYmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM1MTg2MSwiZXhwIjoyMDkyOTI3ODYxfQ.7J7uAsFvZWQPV8bd98R4IG_fc5SyBRIXpM-P3yqWxyE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EMAILS_TO_WIPE = ['uylancejr@gmail.com', 'uylance67@gmail.com'];

async function wipeRecords() {
  console.log(`Starting wipe process for: ${EMAILS_TO_WIPE.join(', ')}`);
  
  try {
    // 1. Get user IDs
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, email, role')
      .in('email', EMAILS_TO_WIPE);
      
    if (userErr) throw userErr;
    if (!users || users.length === 0) {
      console.log('No users found matching these emails in the public.users table.');
      return;
    }

    const userIds = users.map(u => u.id);
    console.log(`Found ${userIds.length} users:`);
    users.forEach(u => console.log(` - ${u.email} (ID: ${u.id}, Role: ${u.role})`));

    // Wait for the cascade deletions
    console.log('\n--- Wiping Data ---');

    // Delete cases where user is client or attorney
    for (const uid of userIds) {
      console.log(`Deleting cases involving user ${uid}...`);
      const { error: delClientCases } = await supabase.from('cases').delete().eq('client_id', uid);
      if (delClientCases) console.error(`Error deleting cases as client for ${uid}:`, delClientCases);
      
      const { error: delAttyCases } = await supabase.from('cases').delete().eq('attorney_id', uid);
      if (delAttyCases) console.error(`Error deleting cases as attorney for ${uid}:`, delAttyCases);
    }

    // Delete messages sent by the user
    for (const uid of userIds) {
      console.log(`Deleting messages sent by user ${uid}...`);
      const { error: delMessages } = await supabase.from('messages').delete().eq('sender_id', uid);
      if (delMessages) console.error(`Error deleting messages for ${uid}:`, delMessages);
    }
    
    // Delete thread participants and orphan threads
    for (const uid of userIds) {
      console.log(`Cleaning thread participants for ${uid}...`);
      const { error: delThreads } = await supabase.from('thread_participants').delete().eq('user_id', uid);
      if (delThreads) console.error(`Error deleting thread participants for ${uid}:`, delThreads);
    }

    // Since message_threads might not have an owner, we should probably delete message_threads that have 0 participants.
    // For simplicity, any thread that no longer has participants will be functionally orphaned. 
    // We can also try to delete AI conversations / messages if they exist.
    for (const uid of userIds) {
      console.log(`Deleting AI conversations/messages for ${uid}...`);
      const { error: delAiMsgs } = await supabase.from('ai_messages').delete().eq('user_id', uid);
      if (delAiMsgs && delAiMsgs.code !== '42P01') console.error(`Error deleting ai_messages for ${uid}:`, delAiMsgs);

      const { error: delAiConvs } = await supabase.from('ai_conversations').delete().eq('user_id', uid);
      if (delAiConvs && delAiConvs.code !== '42P01') console.error(`Error deleting ai_conversations for ${uid}:`, delAiConvs);
    }

    // Delete generated documents
    for (const uid of userIds) {
      console.log(`Deleting generated documents for ${uid}...`);
      const { error: delDocs } = await supabase.from('generated_documents').delete().eq('user_id', uid);
      if (delDocs && delDocs.code !== '42P01') console.error(`Error deleting generated_documents for ${uid}:`, delDocs);
    }

    // Delete notifications
    for (const uid of userIds) {
      console.log(`Deleting notifications for ${uid}...`);
      const { error: delNotifs } = await supabase.from('notifications').delete().eq('user_id', uid);
      if (delNotifs) console.error(`Error deleting notifications for ${uid}:`, delNotifs);
    }

    // Delete audit logs
    for (const uid of userIds) {
      console.log(`Deleting audit logs for ${uid}...`);
      const { error: delAudit } = await supabase.from('audit_logs').delete().eq('user_id', uid);
      if (delAudit) console.error(`Error deleting audit logs for ${uid}:`, delAudit);
    }
    
    // We can also delete pro_bono_logs where attorney_id = uid (some might not cascade if case wasn't theirs but they logged hours somehow)
    for (const uid of userIds) {
      console.log(`Deleting pro_bono_logs for ${uid}...`);
      const { error: delLogs } = await supabase.from('pro_bono_logs').delete().eq('attorney_id', uid);
      if (delLogs) console.error(`Error deleting pro_bono_logs for ${uid}:`, delLogs);
    }

    console.log('\n✅ Data wipe complete! The user accounts are still intact.');

  } catch (err) {
    console.error('Fatal Error during wipe:', err);
  }
}

wipeRecords();
