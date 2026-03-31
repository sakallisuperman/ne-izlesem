import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json()

    const userMessage = `
Kullanıcının cevapları:
- Ruh hali: ${answers.mood}
- Vakit: ${answers.time}
- İzleme şekli: ${answers.style}
- Final tercihi: ${answers.ending}
- Dil tercihi: ${answers.language}
- Kişi sayısı: ${answers.company}
- Favori türler: ${answers.genres?.join(', ')}
- Son sevdiği yapıt: ${answers.lastWatched || 'Belirtmedi'}

Bu kişiye 5 film veya dizi öner.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Sen bir film ve dizi uzmanısın. Kullanıcının ruh haline, vaktine ve tercihlerine göre 5 adet film veya dizi önerisi yapacaksın. 
Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film","year":2019,"duration":"2s 15dk","imdb":8.2,"reason":"Bu kullanıcı için neden uygun 2-3 cümle","tags":["#tag1","#tag2","#tag3"]}]}`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = completion.choices[0].message.content || ''
    const cleaned = content.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    await supabase.from('sessions').insert({
      answers,
      recommendations: data.recommendations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Bir sorun oluştu' }, { status: 500 })
  }
}
