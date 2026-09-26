import { Module } from "@nestjs/common";

import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./e-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./f-letter-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./h-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./i-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";

/**
 * Provides and exports every minimal letter glyph characteristic evaluator —
 * each upright letter and each distinct rotation of an asymmetric one — as
 * one group `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    ALetterCountCharacteristicService,
    BLetterCountCharacteristicService,
    CLetterCountCharacteristicService,
    ELetterCountCharacteristicService,
    FLetterCountCharacteristicService,
    HLetterCountCharacteristicService,
    ILetterCountCharacteristicService,
    LLetterCountCharacteristicService,
    MLetterCountCharacteristicService,
    NLetterCountCharacteristicService,
    OLetterCountCharacteristicService,
    SLetterCountCharacteristicService,
    TLetterCountCharacteristicService,
    ULetterCountCharacteristicService,
    WLetterCountCharacteristicService,
    XLetterCountCharacteristicService,
    YLetterCountCharacteristicService,
    ZLetterCountCharacteristicService,
  ],
  imports: [],
  providers: [
    ALetterCountCharacteristicService,
    BLetterCountCharacteristicService,
    CLetterCountCharacteristicService,
    ELetterCountCharacteristicService,
    FLetterCountCharacteristicService,
    HLetterCountCharacteristicService,
    ILetterCountCharacteristicService,
    LLetterCountCharacteristicService,
    MLetterCountCharacteristicService,
    NLetterCountCharacteristicService,
    OLetterCountCharacteristicService,
    SLetterCountCharacteristicService,
    TLetterCountCharacteristicService,
    ULetterCountCharacteristicService,
    WLetterCountCharacteristicService,
    XLetterCountCharacteristicService,
    YLetterCountCharacteristicService,
    ZLetterCountCharacteristicService,
  ],
})
export class LetterCharacteristicsModule {}
