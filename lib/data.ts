export type Place = { id:string; name:string; type:string; area:string; description:string; image:string; tag:string; price?:string; phone?:string; verified:boolean };
// Illustrative demo records. Replace with reviewed real data before production publication.
export const places: Place[] = [
 {id:'pantai-ujung-genteng',name:'Pantai Ujung Genteng',type:'Wisata',area:'Ujung Genteng',description:'Bentang pantai selatan dengan suasana pesisir yang khas. Periksa kondisi ombak dan informasi setempat sebelum berkunjung.',image:'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85',tag:'Pesisir',verified:false},
 {id:'curug-cikaso',name:'Curug Cikaso',type:'Wisata',area:'Surade',description:'Air terjun dengan lanskap hijau yang menarik untuk dijelajahi bersama pemandu lokal.',image:'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=85',tag:'Alam',verified:false},
 {id:'pantai-minajaya',name:'Pantai Minajaya',type:'Wisata',area:'Surade',description:'Destinasi pesisir untuk menikmati bentang laut dan suasana desa pantai.',image:'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85',tag:'Pesisir',verified:false},
 {id:'warung-pesisir',name:'Kuliner Pesisir',type:'Kuliner',area:'Ujung Genteng',description:'Temukan pilihan hidangan lokal dari pelaku usaha di sekitar kawasan pesisir.',image:'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=85',tag:'Kuliner lokal',verified:false},
 {id:'homestay-lokal',name:'Penginapan Lokal',type:'Penginapan',area:'Ciracap',description:'Jelajahi pilihan penginapan lokal. Hubungi pemilik untuk memastikan harga dan ketersediaan.',image:'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85',tag:'Menginap',verified:false},
 {id:'umkm-kerajinan',name:'Produk UMKM Lokal',type:'Produk',area:'Ciracap',description:'Dukung produk dan karya pelaku usaha lokal Sukabumi Selatan.',image:'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1200&q=85',tag:'UMKM',verified:false}
];
export const plans = [
 {name:'FREE',price:'Rp0',period:'selamanya',products:'3 produk',photos:'3 foto produk total',businessPhotos:'3 foto profil usaha',featured:false},
 {name:'PREMIUM',price:'Rp25.000',period:'/ bulan',products:'50 produk',photos:'5 foto per produk',businessPhotos:'10 foto profil usaha',featured:true},
 {name:'BISNIS',price:'Rp50.000',period:'/ bulan',products:'200 produk',photos:'8 foto per produk',businessPhotos:'20 foto profil usaha',featured:false}
];
