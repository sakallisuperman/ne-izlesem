import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

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
    })

    const content = completion.choices[0].message.content || ''
    return NextResponse.json({ message: content })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Bir sorun oluştu' }, { status: 500 })
  }
}
