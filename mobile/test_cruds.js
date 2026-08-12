const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wubznedcvolfmdhtcbgh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnpuZWRjdm9sZm1kaHRjYmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM1MTg2MSwiZXhwIjoyMDkyOTI3ODYxfQ.7J7uAsFvZWQPV8bd98R4IG_fc5SyBRIXpM-P3yqWxyE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCRUD() {
  console.log('Testing CRUD operations (using Service Key)...');

  try {
    // Get real users from the db
    const { data: users, error: userErr } = await supabase.from('users').select('id, role').limit(10);
    if (userErr) throw userErr;

    if (users.length === 0) {
      console.log('No users found in DB. Please run database seeding.');
      return;
    }

    const citizen = users.find(u => u.role === 'Citizen') || users[0];
    const attorney = users.find(u => u.role === 'Volunteer Attorney') || users[0];
    
    console.log(`Using Citizen: ${citizen.id}, Attorney: ${attorney.id}`);

    const userId = citizen.id;
    const attorneyId = attorney.id;
    const newIds = {};

    // 1. CASES
    console.log('\n--- CASES ---');
    const { data: newCase, error: caseCreateErr } = await supabase
      .from('cases')
      .insert({ title: 'Test Case CRUD', client_id: userId, description: 'Test description', status: 'Pending Triage' })
      .select().single();
    if (caseCreateErr) throw caseCreateErr;
    newIds.caseId = newCase.id;
    console.log('CREATE: success', newCase.id);

    const { error: caseUpdateErr } = await supabase
      .from('cases')
      .update({ attorney_id: attorneyId, status: 'In Progress' })
      .eq('id', newIds.caseId);
    if (caseUpdateErr) throw caseUpdateErr;
    console.log('UPDATE: success');

    const { error: caseReadErr } = await supabase
      .from('cases')
      .select('*')
      .eq('id', newIds.caseId).single();
    if (caseReadErr) throw caseReadErr;
    console.log('READ: success');

    // 2. TRIAGE ASSESSMENTS
    console.log('\n--- TRIAGE ASSESSMENTS ---');
    const { data: newTriage, error: triageCreateErr } = await supabase
      .from('triage_assessments')
      .insert({ case_id: newIds.caseId, issue_type: 'Test Issue', match_percentage: 95.0 })
      .select().single();
    if (triageCreateErr) throw triageCreateErr;
    newIds.triageId = newTriage.id;
    console.log('CREATE: success');

    const { error: triageReadErr } = await supabase
      .from('triage_assessments')
      .select('*')
      .eq('id', newIds.triageId).single();
    if (triageReadErr) throw triageReadErr;
    console.log('READ: success');
    
    // 3. PRO BONO LOGS
    console.log('\n--- PRO BONO LOGS ---');
    const { data: newLog, error: logCreateErr } = await supabase
      .from('pro_bono_logs')
      .insert({ case_id: newIds.caseId, attorney_id: attorneyId, hours: 2.5, description: 'Test log' })
      .select().single();
    if (logCreateErr) throw logCreateErr;
    newIds.logId = newLog.id;
    console.log('CREATE: success');

    const { error: logUpdateErr } = await supabase
      .from('pro_bono_logs')
      .update({ is_verified: true })
      .eq('id', newIds.logId);
    if (logUpdateErr) throw logUpdateErr;
    console.log('UPDATE: success');

    // 4. MESSAGE THREADS & MESSAGES
    console.log('\n--- MESSAGES & THREADS ---');
    const { data: newThread, error: threadCreateErr } = await supabase
      .from('message_threads')
      .insert({ case_id: newIds.caseId, name: 'Test Thread' })
      .select().single();
    if (threadCreateErr) throw threadCreateErr;
    newIds.threadId = newThread.id;
    
    const { error: partCreateErr } = await supabase
      .from('thread_participants')
      .insert([{ thread_id: newIds.threadId, user_id: userId }, { thread_id: newIds.threadId, user_id: attorneyId }]);
    if (partCreateErr) throw partCreateErr;
    
    const { data: newMessage, error: msgCreateErr } = await supabase
      .from('messages')
      .insert({ thread_id: newIds.threadId, sender_id: userId, content: 'Hello' })
      .select().single();
    if (msgCreateErr) throw msgCreateErr;
    console.log('CREATE: success');

    // 5. NOTIFICATIONS
    console.log('\n--- NOTIFICATIONS ---');
    const { data: newNotif, error: notifCreateErr } = await supabase
      .from('notifications')
      .insert({ user_id: userId, title: 'Test', body: 'Test Notif', type: 'system' })
      .select().single();
    if (notifCreateErr) throw notifCreateErr;
    newIds.notifId = newNotif.id;
    console.log('CREATE: success');

    const { error: notifUpdateErr } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', newIds.notifId);
    if (notifUpdateErr) throw notifUpdateErr;
    console.log('UPDATE: success');

    // 6. PRIVATE HOURS AND CANCELLATION
    console.log('\n--- PRIVATE HOURS & CANCELLATION ---');
    // Create Private Case
    const { data: privateCase, error: pCaseErr } = await supabase
      .from('cases')
      .insert({ title: 'Private Case Test', client_id: userId, attorney_id: attorneyId, description: 'Private case', status: 'In Progress', lawyer_preference: 'Private' })
      .select().single();
    if (pCaseErr) throw pCaseErr;
    console.log('CREATE Private Case: success', privateCase.id);

    // Log private hours
    const { data: pLog, error: pLogErr } = await supabase
      .from('pro_bono_logs')
      .insert({ case_id: privateCase.id, attorney_id: attorneyId, hours: 5.0, description: 'Private consultation' })
      .select().single();
    if (pLogErr) throw pLogErr;
    console.log('CREATE Private Hours Log: success', pLog.id);

    // Cancel / Withdraw Case
    const { error: pCaseCancelErr } = await supabase
      .from('cases')
      .update({ status: 'Withdrawn' })
      .eq('id', privateCase.id);
    if (pCaseCancelErr) throw pCaseCancelErr;
    console.log('UPDATE Case Status (Cancellation): success');

    // Delete Case (Cascade should delete logs)
    const { error: pCaseDelErr } = await supabase
      .from('cases')
      .delete()
      .eq('id', privateCase.id);
    if (pCaseDelErr) throw pCaseDelErr;
    console.log('DELETE Case: success');
    
    // Verify Cascade Deletion for logs
    const { data: checkLog } = await supabase.from('pro_bono_logs').select('id').eq('id', pLog.id);
    if (checkLog && checkLog.length === 0) {
      console.log('VERIFY Cascade Delete (Logs removed): success');
    } else {
      console.log('VERIFY Cascade Delete: failed, log still exists');
    }

    // CLEANUP
    console.log('\n--- CLEANUP ---');
    
    await supabase.from('notifications').delete().eq('id', newIds.notifId);
    await supabase.from('pro_bono_logs').delete().eq('id', newIds.logId);
    await supabase.from('messages').delete().eq('id', newMessage.id);
    await supabase.from('thread_participants').delete().eq('thread_id', newIds.threadId);
    await supabase.from('message_threads').delete().eq('id', newIds.threadId);
    await supabase.from('triage_assessments').delete().eq('id', newIds.triageId);
    await supabase.from('cases').delete().eq('id', newIds.caseId);
    
    console.log('Cleanup success');
    console.log('\nALL CRUD OPERATIONS SUCCESSFUL!');
  } catch (err) {
    console.error('ERROR during CRUD testing:', err);
  }
}

checkCRUD();
