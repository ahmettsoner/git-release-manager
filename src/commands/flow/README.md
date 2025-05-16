[![npm version](https://badge.fury.io/js/vereasy.svg)](https://www.npmjs.com/package/vereasy)


| Faz                 | Release Name | Channel                       | Açıklama                                                                                              | Sürüm Formatı    | Branch                |
| ------------------- | ------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- | --------------------- |
| Analiz              |              |                               |                                                                                                       |                  |                       |
| Design              |              |                               |                                                                                                       |                  |                       |
| Dev Phase           | Dev          | Dev                           | Aktif geliştirme aşaması, manuel tetiklenir.                                                          | vX.Y.0-dev.N     | dev                   |
| QA Phase            | Test         | Alpha, QA                     | Dahili test aşaması, her iteration sonunda çıkar.                                                     | vX.Y.0-alpha.N   | release/X.Y.Z-alpha   |
| Staging Phase       | Stage        | Beta, RC, Preview, Pilot, UAT | Final öncesi son aşama, iç testler veya geniş test kullanıcıları için. Opsiyonel: Bir tanesi seçilir. | vX.Y.0-beta.N    | release/X.Y.Z-beta    |
|                     |              |                               |                                                                                                       | vX.Y.0-rc.N      | release/X.Y.Z-rc      |
|                     |              |                               |                                                                                                       | vX.Y.0-preview.N | release/X.Y.Z-preview |
| Production Phase    | Final        | Stable                        | Kararlı sürüm, release hazırlanması, döküman ve kullanıcı araçlarının hazırlanması                    | vX.Y.0           | release/X.Y.Z         |
| Distribution  Phase |              |                               | main branch'e merge edilir ve üretime alınır.                                                         |                  | release/X.Y.Z → main  |


## Dev Fazı

* dev branch üzerinde geliştirme yapılır.
* Her yeni özellik için feature/* branch açılır ve tamamlanınca dev'e merge edilir.
* v1.5.0-dev.1, v1.5.0-dev.2 gibi Dev tag’ler manuel olarak çıkılır.

```shell
git checkout dev
git checkout -b feature/add-new-api
# Geliştirme tamamlanınca:
git checkout dev
git merge feature/add-new-api --no-ff
git branch -d feature/add-new-api
git push origin dev
```


## QA Fazı (Alpha Release)

* Her iteration sonunda release/X.Y.Z-alpha branch açılır.
* v1.5.0-alpha.1, v1.5.0-alpha.2 gibi tag’ler otomatik olarak çıkılır.
* Test sırasında yapılan düzeltmeler release/X.Y.Z-alpha branch'inde yapılır ve dev'e merge edilir.

```shell
git checkout -b release/1.5.0-alpha dev
git tag -a v1.5.0-alpha.1 -m "Alpha release v1.5.0-alpha.1"
git push origin release/1.5.0-alpha
git push origin v1.5.0-alpha.1
```

Fix çıkarsa:
```shell
git checkout release/1.5.0-alpha
# Fix işlemi yap ve commit et
git add .
git commit -m "Fix issue in alpha release"
git checkout dev
git merge release/1.5.0-alpha --no-ff
git push origin dev
```

## Staging Fazı (Opsiyonel Beta, RC veya Preview)

* Eğer staging aşaması gerekiyorsa, release/X.Y.Z-beta, release/X.Y.Z-rc veya release/X.Y.Z-preview branch'lerinden biri açılır.
* Testlerin sonucuna göre yalnızca bir tanesi seçilir.

```shell
git checkout -b release/1.5.0-beta release/1.5.0-alpha
git tag -a v1.5.0-beta.1 -m "Beta release v1.5.0-beta.1"
git push origin release/1.5.0-beta
git push origin v1.5.0-beta.1
```

Fix çıkarsa:
```shell
git checkout release/1.5.0-beta
# Fix işlemi yap ve commit et
git add .
git commit -m "Fix issue in beta release"
git checkout dev
git merge release/1.5.0-beta --no-ff
git push origin dev
```

## Production Fazı (Stabil Release)

* Beta, RC veya Preview tamamlandıktan sonra release/X.Y.Z branch'i açılır.
* release/X.Y.Z stabil hale geldikten sonra main branch’e merge edilir.
* v1.5.0 stabil release olarak çıkar.

```shell
git checkout -b release/1.5.0 release/1.5.0-beta
git tag -a v1.5.0 -m "Stable release v1.5.0"
git push origin release/1.5.0
git push origin v1.5.0
```

Stabil sürüm main branch’e merge edilir:

```shell
git checkout main
git merge release/1.5.0 --no-ff
git push origin main
```

Fix çıkarsa:
```shell
git checkout -b release/1.5.1 release/1.5.0
# Fix işlemi yap ve commit et
git add .
git commit -m "Patch fix for v1.5.1"
git tag -a v1.5.1 -m "Patch release v1.5.1"
git push origin release/1.5.1
git push origin v1.5.1
```