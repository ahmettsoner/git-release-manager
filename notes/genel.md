<<<<<<< HEAD
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
=======
| Command                                         | Version Result | Description                                                                                                              |     |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ | --- |
| grm version --help                              |                | Yardım mesajı                                                                                                            |     |
| grm version --init                              | 0.0.0          | 0.0.0 version için tag oluşturur                                                                                         |     |
| grm version --init 1.0.0                        | 1.0.0          | parametre olarak belirtilen  version için ilk tag oluşturulur                                                            |     |
| grm version --patch                             | 0.0.1          | eğer tag yoksa 0.0.0 mevcut tag gibi, tag varsa mevcut en son tag'a patch increment eder                                 |     |
| grm version --minor                             | 0.1.0          | eğer tag yoksa 0.0.0 mevcut tag gibi, tag varsa mevcut en son tag'a minor increment eder                                 |     |
| grm version --major                             | 1.0.0          | eğer tag yoksa 0.0.0 mevcut tag gibi, tag varsa mevcut en son tag'a major increment eder                                 |     |
| grm version --channel alpha                     | 1.0.0-alpha.1  | bulunan en yüksek tag'e channel bilgisi ekler ve channel number yoksa ekler varsa artırır                                | *1  |
| grm version --channel alpha --patch             | 1.0.1-alpha.1  | bulunan en yüksek tag'e patch icrement ederek channel bilgisi ekler ve channel number 1 olarak set eder                  |     |
| grm version --channel alpha --no-channel-number | 1.0.0-alpha    | channel number eklemez, basit bir channel name bulunur sadece                                                            |     |
| grm version --patch --prefix v                  | v0.0.1         | prefix version gruplama için kullanılabildiği için farklı prefixli tag'lardan bağımsız yeni bir version sıralaması yapar |     |

*1 version yükseltildiğinde, channel için uygulanan version'dan devam ediyor, --patch, --minor, --major ile yükseltilmeli yeni versiyon için
sadece burda bir tutarsızlık var, mesela 1.0.0 varken ilk defa channel alpha çalıştırıldığında 1.0.0-alpha.1 oluyor, major, minor ve patch bağımsız yüksltildiğinde örneğin 1.1.0 olduğunda channel alpha 1.0.0-alpha.2 olurken yeni channel test oluşturduğunda 1.1.0-test.1 oluyor

>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75


git tag sıralama (major.minor.patch numaralarına göre, channel belirtlmişse en büyük versiyon'un aynı channel'ının channel number'a göre)

burda ihtiyaç olan, flag'lere göre en uygun tag'ı seçmek ve bu tag'a ygun şekilde increment edebilmek.