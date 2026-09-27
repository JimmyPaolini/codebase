import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { ALatinLetterCharacteristicsService } from "./a-latin-letter-characteristics.service";
import { AinIsolatedArabicLetterCharacteristicsService } from "./ain-isolated-arabic-letter-characteristics.service";
import { AoHanziLetterCharacteristicsService } from "./ao-hanzi-letter-characteristics.service";
import { BLatinLetterCharacteristicsService } from "./b-latin-letter-characteristics.service";
import { BehIsolatedArabicLetterCharacteristicsService } from "./beh-isolated-arabic-letter-characteristics.service";
import { CLatinLetterCharacteristicsService } from "./c-latin-letter-characteristics.service";
import { DalIsolatedArabicLetterCharacteristicsService } from "./dal-isolated-arabic-letter-characteristics.service";
import { DaletHebrewLetterCharacteristicsService } from "./dalet-hebrew-letter-characteristics.service";
import { DeltaGreekLetterCharacteristicsService } from "./delta-greek-letter-characteristics.service";
import { ELatinLetterCharacteristicsService } from "./e-latin-letter-characteristics.service";
import { FLatinLetterCharacteristicsService } from "./f-latin-letter-characteristics.service";
import { FehIsolatedArabicLetterCharacteristicsService } from "./feh-isolated-arabic-letter-characteristics.service";
import { GanHanziLetterCharacteristicsService } from "./gan-hanzi-letter-characteristics.service";
import { HLatinLetterCharacteristicsService } from "./h-latin-letter-characteristics.service";
import { HahIsolatedArabicLetterCharacteristicsService } from "./hah-isolated-arabic-letter-characteristics.service";
import { ILatinLetterCharacteristicsService } from "./i-latin-letter-characteristics.service";
import { JiaHanziLetterCharacteristicsService } from "./jia-hanzi-letter-characteristics.service";
import { JingHanziLetterCharacteristicsService } from "./jing-hanzi-letter-characteristics.service";
import { KafIsolatedArabicLetterCharacteristicsService } from "./kaf-isolated-arabic-letter-characteristics.service";
import { KappaGreekLetterCharacteristicsService } from "./kappa-greek-letter-characteristics.service";
import { KieukHangulLetterCharacteristicsService } from "./kieuk-hangul-letter-characteristics.service";
import { LLatinLetterCharacteristicsService } from "./l-latin-letter-characteristics.service";
import { LamIsolatedArabicLetterCharacteristicsService } from "./lam-isolated-arabic-letter-characteristics.service";
import { LambdaGreekLetterCharacteristicsService } from "./lambda-greek-letter-characteristics.service";
import { LamedHebrewLetterCharacteristicsService } from "./lamed-hebrew-letter-characteristics.service";
import { LetterUtilitiesService } from "./letter-utilities.service";
import { MLatinLetterCharacteristicsService } from "./m-latin-letter-characteristics.service";
import { MuHanziLetterCharacteristicsService } from "./mu-hanzi-letter-characteristics.service";
import { NLatinLetterCharacteristicsService } from "./n-latin-letter-characteristics.service";
import { NoonIsolatedArabicLetterCharacteristicsService } from "./noon-isolated-arabic-letter-characteristics.service";
import { OLatinLetterCharacteristicsService } from "./o-latin-letter-characteristics.service";
import { OmegaGreekLetterCharacteristicsService } from "./omega-greek-letter-characteristics.service";
import { PhiGreekLetterCharacteristicsService } from "./phi-greek-letter-characteristics.service";
import { PieupHangulLetterCharacteristicsService } from "./pieup-hangul-letter-characteristics.service";
import { PsiGreekLetterCharacteristicsService } from "./psi-greek-letter-characteristics.service";
import { QafIsolatedArabicLetterCharacteristicsService } from "./qaf-isolated-arabic-letter-characteristics.service";
import { RehIsolatedArabicLetterCharacteristicsService } from "./reh-isolated-arabic-letter-characteristics.service";
import { RhoGreekLetterCharacteristicsService } from "./rho-greek-letter-characteristics.service";
import { SLatinLetterCharacteristicsService } from "./s-latin-letter-characteristics.service";
import { SadIsolatedArabicLetterCharacteristicsService } from "./sad-isolated-arabic-letter-characteristics.service";
import { SeenIsolatedArabicLetterCharacteristicsService } from "./seen-isolated-arabic-letter-characteristics.service";
import { ShangHanziLetterCharacteristicsService } from "./shang-hanzi-letter-characteristics.service";
import { ShenHanziLetterCharacteristicsService } from "./shen-hanzi-letter-characteristics.service";
import { SigmaGreekLetterCharacteristicsService } from "./sigma-greek-letter-characteristics.service";
import { TLatinLetterCharacteristicsService } from "./t-latin-letter-characteristics.service";
import { TahIsolatedArabicLetterCharacteristicsService } from "./tah-isolated-arabic-letter-characteristics.service";
import { TavHebrewLetterCharacteristicsService } from "./tav-hebrew-letter-characteristics.service";
import { TianHanziLetterCharacteristicsService } from "./tian-hanzi-letter-characteristics.service";
import { TuHanziLetterCharacteristicsService } from "./tu-hanzi-letter-characteristics.service";
import { TuSoilHanziLetterCharacteristicsService } from "./tu-soil-hanzi-letter-characteristics.service";
import { ULatinLetterCharacteristicsService } from "./u-latin-letter-characteristics.service";
import { WLatinLetterCharacteristicsService } from "./w-latin-letter-characteristics.service";
import { WangHanziLetterCharacteristicsService } from "./wang-hanzi-letter-characteristics.service";
import { WawIsolatedArabicLetterCharacteristicsService } from "./waw-isolated-arabic-letter-characteristics.service";
import { XLatinLetterCharacteristicsService } from "./x-latin-letter-characteristics.service";
import { YLatinLetterCharacteristicsService } from "./y-latin-letter-characteristics.service";
import { YaHangulLetterCharacteristicsService } from "./ya-hangul-letter-characteristics.service";
import { YehIsolatedArabicLetterCharacteristicsService } from "./yeh-isolated-arabic-letter-characteristics.service";
import { YeoHangulLetterCharacteristicsService } from "./yeo-hangul-letter-characteristics.service";
import { YoHangulLetterCharacteristicsService } from "./yo-hangul-letter-characteristics.service";
import { YouHanziLetterCharacteristicsService } from "./you-hanzi-letter-characteristics.service";
import { YuHangulLetterCharacteristicsService } from "./yu-hangul-letter-characteristics.service";
import { YuKatakanaLetterCharacteristicsService } from "./yu-katakana-letter-characteristics.service";
import { ZLatinLetterCharacteristicsService } from "./z-latin-letter-characteristics.service";

/**
 * Provides and exports every letter service — Latin, Greek, Hebrew,
 * Arabic, katakana, hanzi, and hangul, one service per letter (and per
 * positional form of a dotless Arabic skeleton) — as one group
 * `CharacteristicsModule` imports and re-exports, along with the
 * `LetterUtilitiesService` orientation arithmetic they inject.
 *
 * Each letter holds one base template facing its script's reading corner —
 * Southeast, or Southwest for Hebrew and Arabic — and provides sixteen
 * evaluators, one per orientation: each corner (the base, its east–west
 * mirror, its north–south mirror, and both) turned by none, a quarter, a
 * half, or three quarters clockwise. Names that draw the same ink count it alike, and
 * letters that are orientations of one another share ink too.
 */
@Module({
  controllers: [],
  exports: [
    LetterUtilitiesService,
    ALatinLetterCharacteristicsService,
    AinIsolatedArabicLetterCharacteristicsService,
    AoHanziLetterCharacteristicsService,
    BLatinLetterCharacteristicsService,
    BehIsolatedArabicLetterCharacteristicsService,
    CLatinLetterCharacteristicsService,
    DalIsolatedArabicLetterCharacteristicsService,
    DaletHebrewLetterCharacteristicsService,
    DeltaGreekLetterCharacteristicsService,
    ELatinLetterCharacteristicsService,
    FLatinLetterCharacteristicsService,
    FehIsolatedArabicLetterCharacteristicsService,
    GanHanziLetterCharacteristicsService,
    HLatinLetterCharacteristicsService,
    HahIsolatedArabicLetterCharacteristicsService,
    ILatinLetterCharacteristicsService,
    JiaHanziLetterCharacteristicsService,
    JingHanziLetterCharacteristicsService,
    KafIsolatedArabicLetterCharacteristicsService,
    KappaGreekLetterCharacteristicsService,
    KieukHangulLetterCharacteristicsService,
    LLatinLetterCharacteristicsService,
    LamIsolatedArabicLetterCharacteristicsService,
    LambdaGreekLetterCharacteristicsService,
    LamedHebrewLetterCharacteristicsService,
    MLatinLetterCharacteristicsService,
    MuHanziLetterCharacteristicsService,
    NLatinLetterCharacteristicsService,
    NoonIsolatedArabicLetterCharacteristicsService,
    OLatinLetterCharacteristicsService,
    OmegaGreekLetterCharacteristicsService,
    PhiGreekLetterCharacteristicsService,
    PieupHangulLetterCharacteristicsService,
    PsiGreekLetterCharacteristicsService,
    QafIsolatedArabicLetterCharacteristicsService,
    RehIsolatedArabicLetterCharacteristicsService,
    RhoGreekLetterCharacteristicsService,
    SLatinLetterCharacteristicsService,
    SadIsolatedArabicLetterCharacteristicsService,
    SeenIsolatedArabicLetterCharacteristicsService,
    ShangHanziLetterCharacteristicsService,
    ShenHanziLetterCharacteristicsService,
    SigmaGreekLetterCharacteristicsService,
    TLatinLetterCharacteristicsService,
    TahIsolatedArabicLetterCharacteristicsService,
    TavHebrewLetterCharacteristicsService,
    TianHanziLetterCharacteristicsService,
    TuHanziLetterCharacteristicsService,
    TuSoilHanziLetterCharacteristicsService,
    ULatinLetterCharacteristicsService,
    WLatinLetterCharacteristicsService,
    WangHanziLetterCharacteristicsService,
    WawIsolatedArabicLetterCharacteristicsService,
    XLatinLetterCharacteristicsService,
    YLatinLetterCharacteristicsService,
    YaHangulLetterCharacteristicsService,
    YehIsolatedArabicLetterCharacteristicsService,
    YeoHangulLetterCharacteristicsService,
    YoHangulLetterCharacteristicsService,
    YouHanziLetterCharacteristicsService,
    YuHangulLetterCharacteristicsService,
    YuKatakanaLetterCharacteristicsService,
    ZLatinLetterCharacteristicsService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    LetterUtilitiesService,
    ALatinLetterCharacteristicsService,
    AinIsolatedArabicLetterCharacteristicsService,
    AoHanziLetterCharacteristicsService,
    BLatinLetterCharacteristicsService,
    BehIsolatedArabicLetterCharacteristicsService,
    CLatinLetterCharacteristicsService,
    DalIsolatedArabicLetterCharacteristicsService,
    DaletHebrewLetterCharacteristicsService,
    DeltaGreekLetterCharacteristicsService,
    ELatinLetterCharacteristicsService,
    FLatinLetterCharacteristicsService,
    FehIsolatedArabicLetterCharacteristicsService,
    GanHanziLetterCharacteristicsService,
    HLatinLetterCharacteristicsService,
    HahIsolatedArabicLetterCharacteristicsService,
    ILatinLetterCharacteristicsService,
    JiaHanziLetterCharacteristicsService,
    JingHanziLetterCharacteristicsService,
    KafIsolatedArabicLetterCharacteristicsService,
    KappaGreekLetterCharacteristicsService,
    KieukHangulLetterCharacteristicsService,
    LLatinLetterCharacteristicsService,
    LamIsolatedArabicLetterCharacteristicsService,
    LambdaGreekLetterCharacteristicsService,
    LamedHebrewLetterCharacteristicsService,
    MLatinLetterCharacteristicsService,
    MuHanziLetterCharacteristicsService,
    NLatinLetterCharacteristicsService,
    NoonIsolatedArabicLetterCharacteristicsService,
    OLatinLetterCharacteristicsService,
    OmegaGreekLetterCharacteristicsService,
    PhiGreekLetterCharacteristicsService,
    PieupHangulLetterCharacteristicsService,
    PsiGreekLetterCharacteristicsService,
    QafIsolatedArabicLetterCharacteristicsService,
    RehIsolatedArabicLetterCharacteristicsService,
    RhoGreekLetterCharacteristicsService,
    SLatinLetterCharacteristicsService,
    SadIsolatedArabicLetterCharacteristicsService,
    SeenIsolatedArabicLetterCharacteristicsService,
    ShangHanziLetterCharacteristicsService,
    ShenHanziLetterCharacteristicsService,
    SigmaGreekLetterCharacteristicsService,
    TLatinLetterCharacteristicsService,
    TahIsolatedArabicLetterCharacteristicsService,
    TavHebrewLetterCharacteristicsService,
    TianHanziLetterCharacteristicsService,
    TuHanziLetterCharacteristicsService,
    TuSoilHanziLetterCharacteristicsService,
    ULatinLetterCharacteristicsService,
    WLatinLetterCharacteristicsService,
    WangHanziLetterCharacteristicsService,
    WawIsolatedArabicLetterCharacteristicsService,
    XLatinLetterCharacteristicsService,
    YLatinLetterCharacteristicsService,
    YaHangulLetterCharacteristicsService,
    YehIsolatedArabicLetterCharacteristicsService,
    YeoHangulLetterCharacteristicsService,
    YoHangulLetterCharacteristicsService,
    YouHanziLetterCharacteristicsService,
    YuHangulLetterCharacteristicsService,
    YuKatakanaLetterCharacteristicsService,
    ZLatinLetterCharacteristicsService,
  ],
})
export class LetterCharacteristicsModule {}
