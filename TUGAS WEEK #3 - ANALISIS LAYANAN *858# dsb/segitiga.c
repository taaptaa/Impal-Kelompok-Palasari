#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <errno.h>
#include <ctype.h>

/* Integer: perbandingan eksak. Pecahan: toleransi relatif panjang 1%. */
int sama(double a, double b, int pecahan) {
    return pecahan ? fabs(a-b) <= 0.01*fmax(a,b) + 1e-12*fmax(a,b) : a == b;
}

int main(void) {
    char baris[256], *p, *akhir;
    double s[3], tmp;
    int mode;
    printf("Mode (1=bulat, 2=pecahan): ");
    if (!fgets(baris, sizeof baris, stdin)) return 1;
    if (sscanf(baris, "%d %c", &mode, (char[1]){0}) != 1 || (mode!=1 && mode!=2)) {
        puts("Mode tidak valid."); return 1;
    }
    printf("Masukkan tiga sisi, dipisahkan spasi: ");
    if (!fgets(baris, sizeof baris, stdin)) return 1;
    p=baris;
    for (int i=0; i<3; i++) {
        errno=0; s[i]=strtod(p, &akhir);
        if (akhir==p || errno || !isfinite(s[i]) || fabs(s[i])>1e9 ||
            (mode==1 && trunc(s[i])!=s[i])) {
            puts("Input tidak valid. Batas absolut sisi 1 miliar."); return 1;
        }
        p=akhir;
    }
    while (isspace((unsigned char)*p)) p++;
    if (*p) { puts("Masukkan tepat tiga angka."); return 1; }
    for (int i=0;i<2;i++) for (int j=i+1;j<3;j++)
        if (s[i]>s[j]) {tmp=s[i];s[i]=s[j];s[j]=tmp;}
    double x=s[0], y=s[1], z=s[2];
    if (x<=0 || x<=z-y) { puts("Bukan segitiga."); return 0; }
    int xy=sama(x,y,mode==2), yz=sama(y,z,mode==2), xz=sama(x,z,mode==2);
    int kanan;
    if (mode==1) {
        /* Batas 1e9 menjamin jumlah kuadrat muat dalam long long. */
        long long a=(long long)x,b=(long long)y,c=(long long)z;
        kanan=(a*a+b*b==c*c);
    } else kanan=sama(z,hypot(x,y),1);
    if (xy && yz && xz) puts("Segitiga sama sisi.");
    else if (xy || yz || xz)
        puts(kanan ? "Segitiga sama kaki dan siku-siku." : "Segitiga sama kaki.");
    else if (kanan) puts("Segitiga siku-siku.");
    else puts("Segitiga sembarang.");
    return 0;
}
