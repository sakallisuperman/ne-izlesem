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
- Kaç kişiyle: ${answers.company}
- Favori türler: ${answers.genres?.join(', ')}

Bu kişiye TAM OLARAK 3 film ve 3 dizi öner. Toplamda 6 öneri.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Sen bir film ve dizi uzmanısın. Kullanıcıya TAM OLARAK 3 film ve 3 dizi önereceksin, toplamda 6 öneri.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Orijinal Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film veya dizi","year":2019,"duration":"2s 15dk veya 3 sezon","imdb":8.2,"reason":"Filmi veya diziyi çarpıcı şekilde tanıtan, izleyiciyi heyecanlandıran 2-3 cümlelik özgün açıklama. Kullanıcının tercihlerine neden uyduğunu belirt ama klişe olma. Sanki bir film eleştirmeni yazıyor gibi yaz.","tags":["#bu filme özgü çarpıcı tag","#konuyla ilgili tag","#duygu veya atmosfer tag"]}]}

ÖNEMLİ KURALLAR:
- Her film/dizi için hashtag'ler O YAPITA ÖZEL olsun, genel #gerilim #drama gibi şeyler yazma
- Hashtag örnekleri: #zamandöngüsü #karanlıkgizem #alman yapımı #aile sırrı #adrenalin #beklenmedikson
- Reason alanı filmi/diziyi satmalı, kullanıcıyı izlemeye ikna etmeli
- Gerçek var olan yapıtlar öner, uydurma
- Çeşitlilik sağla`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 2500,
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
