This Figma Make file includes components from [shadcn/ui](https://ui.shadcn.com/) used under [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

This Figma Make file includes photos from [Unsplash](https://unsplash.com) used under [license](https://unsplash.com/license).

## Sprint 2 — ilustrasi inventaris lokal (Wikimedia Commons)

Foto ini **ilustrasi jenis barang**, bukan bukti merek, spesifikasi, kondisi, atau ketersediaan inventaris kampus. Nama/model yang tampak pada foto bukan data inventaris. Whiteboard adalah ilustrasi papan tulis umum; tidak memverifikasi model portabel. Tidak menyiratkan dukungan pemegang merek.

Seluruh tautan sumber dan metadata lisensi diperiksa lewat Wikimedia Commons `imageinfo/extmetadata`. Aset di `src/assets/inventory/` adalah thumbnail proporsional; tidak dipotong atau diedit kontennya, ditampilkan dengan `object-contain`. Atribusi dan tautan lisensi juga tampil di bawah foto dalam UI. Foto CC BY-SA tetap di bawah lisensinya masing-masing, bukan direlisensi sebagai kode aplikasi. Pengubahan/distribusi adaptasi harus mengikuti ShareAlike.

| File lokal | Sumber/judul karya | Pembuat | Izin |
| --- | --- | --- | --- |
| projector.jpg | [InFocus IN34.jpg](https://commons.wikimedia.org/wiki/File:InFocus_IN34.jpg) | Dave Pape | Public domain (PD-self) |
| hdmi.jpg | [HDMI-Connector.jpg](https://commons.wikimedia.org/wiki/File:HDMI-Connector.jpg) | Evan-Amos | Public domain (PD-self) |
| speaker.jpg | [JBL GO 1st generation.jpg](https://commons.wikimedia.org/wiki/File:JBL_GO_1st_generation.jpg) | Apiiroja | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| microphone.jpg | [Shure PG58 with PG2 wireless microphone - on.jpg](https://commons.wikimedia.org/wiki/File:Shure_PG58_with_PG2_wireless_microphone_-_on.jpg) | Christian Dahlqvist | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| chair.jpg | [Folding chairs in a display.jpg](https://commons.wikimedia.org/wiki/File:Folding_chairs_in_a_display.jpg) | Suyash.dwivedi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| table.jpg | [LifetimeTable.jpg](https://commons.wikimedia.org/wiki/File:LifetimeTable.jpg) | GreenGlass1972 | Public domain (PD-self) |
| tripod.jpg | [Gitzo 1541T Traveler Carbon Fiber Tripod Collage Horizontal.jpg](https://commons.wikimedia.org/wiki/File:Gitzo_1541T_Traveler_Carbon_Fiber_Tripod_Collage_Horizontal.jpg) | Lucasbosch | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| camera.jpg | [12 MP digital camera - red.jpg](https://commons.wikimedia.org/wiki/File:12_MP_digital_camera_-_red.jpg) | Packer1028 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| cable-reel.jpg | [Cable reel extension cord.jpg](https://commons.wikimedia.org/wiki/File:Cable_reel_extension_cord.jpg) | Fumikas Sagisavas | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| presenter.png | [PresRemote.png](https://commons.wikimedia.org/wiki/File:PresRemote.png) | BCampbell (WMF) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| whiteboard.jpg | [Whiteboard in office.jpeg](https://commons.wikimedia.org/wiki/File:Whiteboard_in_office.jpeg) | User:openuow | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| hdmi-extension.jpg | [Fire TV Stick HDMI extender.jpg](https://commons.wikimedia.org/wiki/File:Fire_TV_Stick_HDMI_extender.jpg) | Elmepi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

Akuisisi ulang opsional: `node tools/fetch-inventory-photos.mjs`. Runtime menggunakan file lokal, bukan hotlink atau API eksternal. Tidak ada dependency baru. Matching nama hanya 12 nama yang ditinjau (dengan/tanpa akhiran `(Uji)`); nama lain dan kegagalan pemuatan tetap menampilkan fallback.
