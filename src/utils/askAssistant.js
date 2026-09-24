import { supabase } from '../lib/supabaseClient';

// messages: [{ role: 'user'|'assistant', content: string }, ...]
// Devuelve el texto de la respuesta o lanza un error con un mensaje para
// mostrar directo en el chat.
export async function askAssistant({ context, messages }) {
  const { data, error } = await supabase.functions.invoke('ask-assistant', {
    body: { context, messages },
  });

  if (error) {
    throw new Error('No se pudo consultar al asistente. Intenta de nuevo.');
  }
  if (!data?.ok) {
    throw new Error(data?.error || 'No se pudo consultar al asistente.');
  }
  return data.respuesta;
}
