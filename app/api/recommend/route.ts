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
- Ayıracağı zaman: ${answers.time}
- İstediği deneyim: ${answers.style}
- Final tercihi: ${answers.ending}
- Dönem tercihi: ${answers.era}
- Dil tercihi: ${answers.language}
- Kimlerle izliyor: ${answers.company}
- Platformlar: ${Array.isArray(answers.platform) ? answers.platform.join(', ') : answers.platform}
- Favori türler: ${Array.isArray(answers.genres) ? answers.genres.join(', ') : answers.genres}

Bu kişiye TAM OLARAK 3 film ve 3 dizi öner. Toplamda 6 öneri.
ÖNEMLİ: Mainstream/popüler yapımların yanında mutlaka az bilinen, keşfedilmeyi bekleyen yapımlar da öner. Herkesin bildiği filmleri değil, kullanıcıyı şaşırtacak öneriler sun.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Sen bir film ve dizi uzmanısın. Kullanıcıya TAM OLARAK 3 film ve 3 dizi önereceksin, toplamda 6 öneri.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma, markdown kullanma:
{"recommendations":[{"title":"Orijinal Film/Dizi Adı","turkish_title":"Türkçe adı varsa yoksa boş string","type":"film veya dizi","year":2019,"duration":"2s 15dk veya 3 sezon","imdb":8.2,"platform":"Hangi platformda izlenebilir (Netflix, Amazon Prime, vs.)","reason":"Filmi veya diziyi çarpıcı şekilde tanıtan, izleyiciyi heyecanlandıran 2-3 cümlelik özgün açıklama. Kullanıcının tercihlerine neden uyduğunu belirt ama klişe olma. Sanki bir film eleştirmeni yazıyor gibi yaz.","tags":["#bu filme özgü çarpıcı tag","#konuyla ilgili tag","#duygu veya atmosfer tag"]}]}

ÖNEMLİ KURALLAR:
- Her film/dizi için hashtag'ler O YAPITA ÖZEL olsun, genel #gerilim #drama gibi şeyler yazma
- Hashtag örnekleri: #zamandöngüsü #karanlıkgizem #almanyapımı #ailesırrı #adrenalin #beklenmedikson
- Reason alanı filmi/diziyi satmalı, kullanıcıyı izlemeye ikna etmeli
- Gerçek var olan yapıtlar öner, uydurma
- Çeşitlilik sağla — en az 2 öneri az bilinen/niş yapım olsun
- Kullanıcının platform tercihine dikkat et, mümkünse o platformlarda bulunan yapıtları öner
- HER SEFERINDE FARKLI yapıtlar öner, popüler ve niş yapıtları karıştır
- Dönem tercihine uy — yıl aralığına dikkat et
- Dil tercihi "Türkçe dublaj" ise orijinal dili farketmez ama Türkçe dublajı olan yapımlar öner
- Dil tercihi "Türkçe altyazı" ise yabancı yapımlar öner
- "Fark etmez" seçenekleri kısıtlama yok demek, geniş düşün`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.9,
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
