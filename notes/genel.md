grm version --init					0.0.0			zorunlu değil, istenilirse kullanılabilir, sadece git tag boşsa 0.0.0 ekler aksi halde hata dönmez, bilgi mesajı dönebilir
grm version --patch					0.0.1			git tags'te bulunan en yüksek tag'e bir patch yükseltir (standart semver paketi davranışı)
grm version --minor					0.1.0			git tags'te bulunan en yüksek tag'e bir minor yükseltir (standart semver paketi davranışı)
grm version --major					1.0.0			git tags'te bulunan en yüksek tag'e bir major yükseltir (standart semver paketi davranışı)
grm version --channel alpha				1.0.0-alpha.1		git tags'te bulunan en yüksek tag'e channel bilgisi ekler ve channel number yoksa ekler varsa artırır
grm version --channel alpha				1.0.0-alpha.2
grm version --channel beta --no-channel-number		1.0.0-beta		git tags'te bulunan en yüksek tag'e channel ekler, channel number bulunmaz
grm version --channel beta				1.0.0-beta.1
grm version --patch --channel alpha			1.0.1-alpha.1		git tags'te bulunan en yüksek tag'e bir patch yükseltir, standart davranış. ek olarak channel bilgisi ekler
grm version --minor --channel alpha			1.1.0-alpha.1
grm version --major --channel alpha			2.0.0-alpha.1
grm version --major --channel alpha			2.0.0-alpha.2
grm version --prefix v --patch				v0.0.1			git tags'te bulunan prefix ile başlayan en yüksek tag'e bir patch yükseltir


git tag sıralama (major.minor.patch numaralarına göre, channel belirtlmişse en büyük versiyon'un aynı channel'ının channel number'a göre)

burda ihtiyaç olan, flag'lere göre en uygun tag'ı seçmek ve bu tag'a ygun şekilde increment edebilmek.