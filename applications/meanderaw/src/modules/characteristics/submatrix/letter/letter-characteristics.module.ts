import { Module } from "@nestjs/common";

import { AEastLetterCountCharacteristicService } from "./a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./a-west-letter-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./c-west-letter-count-characteristic.service";
import { EDownLetterCountCharacteristicService } from "./e-down-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./e-letter-count-characteristic.service";
import { EUpLetterCountCharacteristicService } from "./e-up-letter-count-characteristic.service";
import { EWestLetterCountCharacteristicService } from "./e-west-letter-count-characteristic.service";
import { FDownLetterCountCharacteristicService } from "./f-down-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./f-letter-count-characteristic.service";
import { FUpLetterCountCharacteristicService } from "./f-up-letter-count-characteristic.service";
import { FWestLetterCountCharacteristicService } from "./f-west-letter-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./h-letter-count-characteristic.service";
import { HSidewaysLetterCountCharacteristicService } from "./h-sideways-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./i-letter-count-characteristic.service";
import { ISidewaysLetterCountCharacteristicService } from "./i-sideways-letter-count-characteristic.service";
import { LDownLetterCountCharacteristicService } from "./l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./l-west-letter-count-characteristic.service";
import { MEastLetterCountCharacteristicService } from "./m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./m-west-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./s-sideways-letter-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./t-west-letter-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./y-west-letter-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./z-sideways-letter-count-characteristic.service";

/**
 * Provides and exports every minimal letter glyph characteristic evaluator —
 * each upright letter and each distinct rotation of an asymmetric one — as
 * one group `CharacteristicsModule` imports and re-exports.
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
  ],
  imports: [],
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
  ],
})
export class LetterCharacteristicsModule {}
