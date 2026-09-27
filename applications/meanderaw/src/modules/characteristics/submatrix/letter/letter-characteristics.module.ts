import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { AEastLetterCountCharacteristicService } from "./a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./a-west-letter-count-characteristic.service";
import { AoEastHanziCountCharacteristicService } from "./ao-east-hanzi-count-characteristic.service";
import { AoHanziCountCharacteristicService } from "./ao-hanzi-count-characteristic.service";
import { AoInvertedHanziCountCharacteristicService } from "./ao-inverted-hanzi-count-characteristic.service";
import { AoWestHanziCountCharacteristicService } from "./ao-west-hanzi-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./c-west-letter-count-characteristic.service";
import { DaletEastLetterCountCharacteristicService } from "./dalet-east-letter-count-characteristic.service";
import { DaletInvertedLetterCountCharacteristicService } from "./dalet-inverted-letter-count-characteristic.service";
import { DaletLetterCountCharacteristicService } from "./dalet-letter-count-characteristic.service";
import { DaletWestLetterCountCharacteristicService } from "./dalet-west-letter-count-characteristic.service";
import { EDownLetterCountCharacteristicService } from "./e-down-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./e-letter-count-characteristic.service";
import { EUpLetterCountCharacteristicService } from "./e-up-letter-count-characteristic.service";
import { EWestLetterCountCharacteristicService } from "./e-west-letter-count-characteristic.service";
import { FDownLetterCountCharacteristicService } from "./f-down-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./f-letter-count-characteristic.service";
import { FUpLetterCountCharacteristicService } from "./f-up-letter-count-characteristic.service";
import { FWestLetterCountCharacteristicService } from "./f-west-letter-count-characteristic.service";
import { GanHanziCountCharacteristicService } from "./gan-hanzi-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./h-letter-count-characteristic.service";
import { HSidewaysLetterCountCharacteristicService } from "./h-sideways-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./i-letter-count-characteristic.service";
import { ISidewaysLetterCountCharacteristicService } from "./i-sideways-letter-count-characteristic.service";
import { JiaHanziCountCharacteristicService } from "./jia-hanzi-count-characteristic.service";
import { JingHanziCountCharacteristicService } from "./jing-hanzi-count-characteristic.service";
import { KieukEastHangulCountCharacteristicService } from "./kieuk-east-hangul-count-characteristic.service";
import { KieukHangulCountCharacteristicService } from "./kieuk-hangul-count-characteristic.service";
import { KieukInvertedHangulCountCharacteristicService } from "./kieuk-inverted-hangul-count-characteristic.service";
import { KieukWestHangulCountCharacteristicService } from "./kieuk-west-hangul-count-characteristic.service";
import { LDownLetterCountCharacteristicService } from "./l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./l-west-letter-count-characteristic.service";
import { LamedLetterCountCharacteristicService } from "./lamed-letter-count-characteristic.service";
import { LamedSidewaysLetterCountCharacteristicService } from "./lamed-sideways-letter-count-characteristic.service";
import { MEastLetterCountCharacteristicService } from "./m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./m-west-letter-count-characteristic.service";
import { MuHanziCountCharacteristicService } from "./mu-hanzi-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { PhiLetterCountCharacteristicService } from "./phi-letter-count-characteristic.service";
import { PieupHangulCountCharacteristicService } from "./pieup-hangul-count-characteristic.service";
import { PieupSidewaysHangulCountCharacteristicService } from "./pieup-sideways-hangul-count-characteristic.service";
import { PsiEastLetterCountCharacteristicService } from "./psi-east-letter-count-characteristic.service";
import { PsiInvertedLetterCountCharacteristicService } from "./psi-inverted-letter-count-characteristic.service";
import { PsiLetterCountCharacteristicService } from "./psi-letter-count-characteristic.service";
import { PsiWestLetterCountCharacteristicService } from "./psi-west-letter-count-characteristic.service";
import { RhoEastLetterCountCharacteristicService } from "./rho-east-letter-count-characteristic.service";
import { RhoInvertedLetterCountCharacteristicService } from "./rho-inverted-letter-count-characteristic.service";
import { RhoLetterCountCharacteristicService } from "./rho-letter-count-characteristic.service";
import { RhoWestLetterCountCharacteristicService } from "./rho-west-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./s-sideways-letter-count-characteristic.service";
import { ShangHanziCountCharacteristicService } from "./shang-hanzi-count-characteristic.service";
import { ShenHanziCountCharacteristicService } from "./shen-hanzi-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./t-west-letter-count-characteristic.service";
import { TavEastLetterCountCharacteristicService } from "./tav-east-letter-count-characteristic.service";
import { TavInvertedLetterCountCharacteristicService } from "./tav-inverted-letter-count-characteristic.service";
import { TavLetterCountCharacteristicService } from "./tav-letter-count-characteristic.service";
import { TavWestLetterCountCharacteristicService } from "./tav-west-letter-count-characteristic.service";
import { TianHanziCountCharacteristicService } from "./tian-hanzi-count-characteristic.service";
import { TuEarthHanziCountCharacteristicService } from "./tu-earth-hanzi-count-characteristic.service";
import { TuEastHanziCountCharacteristicService } from "./tu-east-hanzi-count-characteristic.service";
import { TuHanziCountCharacteristicService } from "./tu-hanzi-count-characteristic.service";
import { TuInvertedHanziCountCharacteristicService } from "./tu-inverted-hanzi-count-characteristic.service";
import { TuWestHanziCountCharacteristicService } from "./tu-west-hanzi-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { WangHanziCountCharacteristicService } from "./wang-hanzi-count-characteristic.service";
import { WangSidewaysHanziCountCharacteristicService } from "./wang-sideways-hanzi-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./y-west-letter-count-characteristic.service";
import { YaHangulCountCharacteristicService } from "./ya-hangul-count-characteristic.service";
import { YeoHangulCountCharacteristicService } from "./yeo-hangul-count-characteristic.service";
import { YoHangulCountCharacteristicService } from "./yo-hangul-count-characteristic.service";
import { YouHanziCountCharacteristicService } from "./you-hanzi-count-characteristic.service";
import { YuEastKatakanaCountCharacteristicService } from "./yu-east-katakana-count-characteristic.service";
import { YuHangulCountCharacteristicService } from "./yu-hangul-count-characteristic.service";
import { YuInvertedKatakanaCountCharacteristicService } from "./yu-inverted-katakana-count-characteristic.service";
import { YuKatakanaCountCharacteristicService } from "./yu-katakana-count-characteristic.service";
import { YuWestKatakanaCountCharacteristicService } from "./yu-west-katakana-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./z-sideways-letter-count-characteristic.service";

/**
 * Provides and exports every minimal letter glyph characteristic evaluator —
 * Latin, Greek, Hebrew, katakana, hanzi, and hangul, each upright glyph and each
 * distinct rotation of an asymmetric one — as one group
 * `CharacteristicsModule` imports and re-exports. A glyph drawn exactly like
 * another script's is one evaluator whose description names both.
 *
 * A rotation's turn word names where the upright glyph's bottom — its base or
 * stem — now points: East and West for a quarter turn whose bottom points east
 * or west, and Inverted for the half turn whose bottom points north.
 */
@Module({
  controllers: [],
  exports: [
    AEastLetterCountCharacteristicService,
    AInvertedLetterCountCharacteristicService,
    ALetterCountCharacteristicService,
    AWestLetterCountCharacteristicService,
    BLetterCountCharacteristicService,
    BSidewaysLetterCountCharacteristicService,
    CLetterCountCharacteristicService,
    CWestLetterCountCharacteristicService,
    EDownLetterCountCharacteristicService,
    ELetterCountCharacteristicService,
    EUpLetterCountCharacteristicService,
    EWestLetterCountCharacteristicService,
    FDownLetterCountCharacteristicService,
    FLetterCountCharacteristicService,
    FUpLetterCountCharacteristicService,
    FWestLetterCountCharacteristicService,
    HLetterCountCharacteristicService,
    HSidewaysLetterCountCharacteristicService,
    ILetterCountCharacteristicService,
    ISidewaysLetterCountCharacteristicService,
    LDownLetterCountCharacteristicService,
    LLetterCountCharacteristicService,
    LUpLetterCountCharacteristicService,
    LWestLetterCountCharacteristicService,
    MEastLetterCountCharacteristicService,
    MLetterCountCharacteristicService,
    MWestLetterCountCharacteristicService,
    NLetterCountCharacteristicService,
    NSidewaysLetterCountCharacteristicService,
    OLetterCountCharacteristicService,
    SLetterCountCharacteristicService,
    SSidewaysLetterCountCharacteristicService,
    TEastLetterCountCharacteristicService,
    TLetterCountCharacteristicService,
    TUpLetterCountCharacteristicService,
    TWestLetterCountCharacteristicService,
    UInvertedLetterCountCharacteristicService,
    ULetterCountCharacteristicService,
    WLetterCountCharacteristicService,
    XLetterCountCharacteristicService,
    YEastLetterCountCharacteristicService,
    YLetterCountCharacteristicService,
    YUpLetterCountCharacteristicService,
    YWestLetterCountCharacteristicService,
    ZLetterCountCharacteristicService,
    ZSidewaysLetterCountCharacteristicService,
    YuKatakanaCountCharacteristicService,
    YuEastKatakanaCountCharacteristicService,
    YuInvertedKatakanaCountCharacteristicService,
    YuWestKatakanaCountCharacteristicService,
    TianHanziCountCharacteristicService,
    WangHanziCountCharacteristicService,
    WangSidewaysHanziCountCharacteristicService,
    TuHanziCountCharacteristicService,
    TuEastHanziCountCharacteristicService,
    TuInvertedHanziCountCharacteristicService,
    TuWestHanziCountCharacteristicService,
    AoHanziCountCharacteristicService,
    AoEastHanziCountCharacteristicService,
    AoInvertedHanziCountCharacteristicService,
    AoWestHanziCountCharacteristicService,
    PieupHangulCountCharacteristicService,
    PieupSidewaysHangulCountCharacteristicService,
    KieukHangulCountCharacteristicService,
    KieukEastHangulCountCharacteristicService,
    KieukInvertedHangulCountCharacteristicService,
    KieukWestHangulCountCharacteristicService,
    DaletLetterCountCharacteristicService,
    DaletEastLetterCountCharacteristicService,
    DaletInvertedLetterCountCharacteristicService,
    DaletWestLetterCountCharacteristicService,
    LamedLetterCountCharacteristicService,
    LamedSidewaysLetterCountCharacteristicService,
    TavLetterCountCharacteristicService,
    TavEastLetterCountCharacteristicService,
    TavInvertedLetterCountCharacteristicService,
    TavWestLetterCountCharacteristicService,
    PhiLetterCountCharacteristicService,
    PsiLetterCountCharacteristicService,
    PsiEastLetterCountCharacteristicService,
    PsiInvertedLetterCountCharacteristicService,
    PsiWestLetterCountCharacteristicService,
    RhoLetterCountCharacteristicService,
    RhoEastLetterCountCharacteristicService,
    RhoInvertedLetterCountCharacteristicService,
    RhoWestLetterCountCharacteristicService,
    YaHangulCountCharacteristicService,
    YeoHangulCountCharacteristicService,
    YoHangulCountCharacteristicService,
    YuHangulCountCharacteristicService,
    TuEarthHanziCountCharacteristicService,
    GanHanziCountCharacteristicService,
    ShangHanziCountCharacteristicService,
    MuHanziCountCharacteristicService,
    YouHanziCountCharacteristicService,
    JiaHanziCountCharacteristicService,
    ShenHanziCountCharacteristicService,
    JingHanziCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    AEastLetterCountCharacteristicService,
    AInvertedLetterCountCharacteristicService,
    ALetterCountCharacteristicService,
    AWestLetterCountCharacteristicService,
    BLetterCountCharacteristicService,
    BSidewaysLetterCountCharacteristicService,
    CLetterCountCharacteristicService,
    CWestLetterCountCharacteristicService,
    EDownLetterCountCharacteristicService,
    ELetterCountCharacteristicService,
    EUpLetterCountCharacteristicService,
    EWestLetterCountCharacteristicService,
    FDownLetterCountCharacteristicService,
    FLetterCountCharacteristicService,
    FUpLetterCountCharacteristicService,
    FWestLetterCountCharacteristicService,
    HLetterCountCharacteristicService,
    HSidewaysLetterCountCharacteristicService,
    ILetterCountCharacteristicService,
    ISidewaysLetterCountCharacteristicService,
    LDownLetterCountCharacteristicService,
    LLetterCountCharacteristicService,
    LUpLetterCountCharacteristicService,
    LWestLetterCountCharacteristicService,
    MEastLetterCountCharacteristicService,
    MLetterCountCharacteristicService,
    MWestLetterCountCharacteristicService,
    NLetterCountCharacteristicService,
    NSidewaysLetterCountCharacteristicService,
    OLetterCountCharacteristicService,
    SLetterCountCharacteristicService,
    SSidewaysLetterCountCharacteristicService,
    TEastLetterCountCharacteristicService,
    TLetterCountCharacteristicService,
    TUpLetterCountCharacteristicService,
    TWestLetterCountCharacteristicService,
    UInvertedLetterCountCharacteristicService,
    ULetterCountCharacteristicService,
    WLetterCountCharacteristicService,
    XLetterCountCharacteristicService,
    YEastLetterCountCharacteristicService,
    YLetterCountCharacteristicService,
    YUpLetterCountCharacteristicService,
    YWestLetterCountCharacteristicService,
    ZLetterCountCharacteristicService,
    ZSidewaysLetterCountCharacteristicService,
    YuKatakanaCountCharacteristicService,
    YuEastKatakanaCountCharacteristicService,
    YuInvertedKatakanaCountCharacteristicService,
    YuWestKatakanaCountCharacteristicService,
    TianHanziCountCharacteristicService,
    WangHanziCountCharacteristicService,
    WangSidewaysHanziCountCharacteristicService,
    TuHanziCountCharacteristicService,
    TuEastHanziCountCharacteristicService,
    TuInvertedHanziCountCharacteristicService,
    TuWestHanziCountCharacteristicService,
    AoHanziCountCharacteristicService,
    AoEastHanziCountCharacteristicService,
    AoInvertedHanziCountCharacteristicService,
    AoWestHanziCountCharacteristicService,
    PieupHangulCountCharacteristicService,
    PieupSidewaysHangulCountCharacteristicService,
    KieukHangulCountCharacteristicService,
    KieukEastHangulCountCharacteristicService,
    KieukInvertedHangulCountCharacteristicService,
    KieukWestHangulCountCharacteristicService,
    DaletLetterCountCharacteristicService,
    DaletEastLetterCountCharacteristicService,
    DaletInvertedLetterCountCharacteristicService,
    DaletWestLetterCountCharacteristicService,
    LamedLetterCountCharacteristicService,
    LamedSidewaysLetterCountCharacteristicService,
    TavLetterCountCharacteristicService,
    TavEastLetterCountCharacteristicService,
    TavInvertedLetterCountCharacteristicService,
    TavWestLetterCountCharacteristicService,
    PhiLetterCountCharacteristicService,
    PsiLetterCountCharacteristicService,
    PsiEastLetterCountCharacteristicService,
    PsiInvertedLetterCountCharacteristicService,
    PsiWestLetterCountCharacteristicService,
    RhoLetterCountCharacteristicService,
    RhoEastLetterCountCharacteristicService,
    RhoInvertedLetterCountCharacteristicService,
    RhoWestLetterCountCharacteristicService,
    YaHangulCountCharacteristicService,
    YeoHangulCountCharacteristicService,
    YoHangulCountCharacteristicService,
    YuHangulCountCharacteristicService,
    TuEarthHanziCountCharacteristicService,
    GanHanziCountCharacteristicService,
    ShangHanziCountCharacteristicService,
    MuHanziCountCharacteristicService,
    YouHanziCountCharacteristicService,
    JiaHanziCountCharacteristicService,
    ShenHanziCountCharacteristicService,
    JingHanziCountCharacteristicService,
  ],
})
export class LetterCharacteristicsModule {}
