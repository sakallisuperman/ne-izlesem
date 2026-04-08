import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const { messages } = await req.json()

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Sen "Ne İzlesem?" uygulamasının film ve dizi asistanısın. Adın Sine. Türkçe konuşuyorsun.

GÖREVLER:
- Kullanıcıyla sohbet ederek film/dizi önerisi ver
- Kullanıcının ruh haline, tercihlerine göre kişiselleştirilmiş öneriler sun
- Film/dizi hakkında bilgi ver (konu, oyuncular, yönetmen, nerede izlenir)
- "X filmini izledim, benzeri ne var?" gibi sorulara cevap ver
- Kullanıcı bir film sahnesini anlatırsa, o sahnenin hangi filmden olduğunu bulmaya çalış ve filmin adını, yılını, sahnenin bağlamını açıkla
- Spoiler verme, ama kullanıcı isterse kısaca bahset

KURALLAR:
- Kısa ve samimi cevaplar ver, uzun paragraflar yazma
- Her öneride filmin/dizinin adı, yılı, türü ve kısa bir açıklama ver
- Nerede izlenebileceğini (Netflix, Amazon, vs.) belirt
- Emoji kullan ama abartma
- Kullanıcı film/dizi dışı bir şey sorarsa nazikçe konuyu film/diziye getir
- Türk yapımlarını da öner, sadece yabancı yapımlara odaklanma`
        },
        ...messages
      ],
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Bir sorun oluştu' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
