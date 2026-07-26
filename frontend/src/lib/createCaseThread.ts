import { SupabaseClient } from '@supabase/supabase-js';

export async function createCaseThread(
  supabase: SupabaseClient,
  caseId: string,
  caseTitle: string,
  clientId: string,
  attorneyId: string,
  isAcceptance: boolean = true
): Promise<string | null> {
  // Returns existing thread if one already exists for this case.
  // SELECT policy uses is_thread_participant() SECURITY DEFINER — no recursion.
  const { data: existing } = await supabase
    .from('message_threads')
    .select('id')
    .eq('case_id', caseId)
    .maybeSingle();

  // Non-acceptance (just opening a chat): return existing thread immediately, no messages
  if (existing && !isAcceptance) return existing.id;

  // Fetch both users' names — needed for messages/notifications in all remaining paths
  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', [clientId, attorneyId]);

  const attorney = userData?.find(u => u.id === attorneyId);
  const client = userData?.find(u => u.id === clientId);
  const attorneyName = attorney
    ? ['Atty.', attorney.first_name, attorney.last_name].filter(Boolean).join(' ')
    : 'Your attorney';
  const clientName = client
    ? [client.first_name, client.last_name].filter(Boolean).join(' ')
    : 'Your client';

  // Acceptance on an already-existing thread: post the acceptance message + notifications
  // without recreating the thread (attorney messaged first, now accepting)
  if (existing && isAcceptance) {
    await supabase.from('messages').insert({
      id: crypto.randomUUID(),
      thread_id: existing.id,
      sender_id: attorneyId,
      content: `${attorneyName} accepted your case: "${caseTitle}". You can now message each other here.`,
      is_read: false,
    });
    await Promise.all([
      supabase.from('notifications').insert({
        user_id: clientId,
        title: 'Case Accepted',
        body: `${attorneyName} accepted your case: "${caseTitle}". Tap to open your conversation.`,
        link: '/public/messages',
      }),
      supabase.from('notifications').insert({
        user_id: attorneyId,
        title: 'Case Accepted',
        body: `You accepted ${clientName}'s case: "${caseTitle}". Tap to open your conversation.`,
        link: '/legal/messages',
      }),
    ]);
    return existing.id;
  }

  // No thread yet — create one
  const threadId = crypto.randomUUID();

  const { error: threadError } = await supabase
    .from('message_threads')
    .insert({ id: threadId, case_id: caseId, name: caseTitle });

  if (threadError) return null;

  const { error: participantsError } = await supabase
    .from('thread_participants')
    .insert([
      { thread_id: threadId, user_id: clientId },
      { thread_id: threadId, user_id: attorneyId },
    ]);

  if (participantsError) return null;

  if (isAcceptance) {
    await supabase.from('messages').insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      sender_id: attorneyId,
      content: `${attorneyName} accepted your case: "${caseTitle}". You can now message each other here.`,
      is_read: false,
    });
    await Promise.all([
      supabase.from('notifications').insert({
        user_id: clientId,
        title: 'Case Accepted',
        body: `${attorneyName} accepted your case: "${caseTitle}". Tap to open your conversation.`,
        link: '/public/messages',
      }),
      supabase.from('notifications').insert({
        user_id: attorneyId,
        title: 'Case Accepted',
        body: `You accepted ${clientName}'s case: "${caseTitle}". Tap to open your conversation.`,
        link: '/legal/messages',
      }),
    ]);
  } else {
    // Thread opened for messaging without acceptance — neutral opener
    await supabase.from('messages').insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      sender_id: attorneyId,
      content: `${attorneyName} opened a conversation about your case: "${caseTitle}".`,
      is_read: false,
    });
  }

  return threadId;
}
