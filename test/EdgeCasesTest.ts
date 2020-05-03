import * as assert from "assert";
import * as nanoid from "nanoid";
import { MapSchema, Schema, type, ArraySchema } from "../src";

import { State, Player, DeepEntity, DeepState2, Another } from "./Schema";

describe("Edge cases", () => {

    it("NIL check should not collide", () => {
        class State extends Schema {
            @type("int32") num: number;
            @type({ map: "int32" }) mapOfNum = new MapSchema<number>();
            @type(["int32"]) arrayOfNum = new ArraySchema<number>();
        }

        const state = new State();
        state.num = 3519;
        state.mapOfNum['one'] = 3519;
        state.arrayOfNum[0] = 3519;

        const decodedState = new State();
        decodedState.decode(state.encode());

        /**
         * 3520 is encoded as [192, 13, 0, 0]
         * (192 is the NIL byte indicator)
         */
        state.num = 3520;
        state.mapOfNum['one'] = 3520;
        state.arrayOfNum[0] = 3520;

        decodedState.decode(state.encode());

        assert.deepEqual(decodedState.toJSON(), {
            num: 3520,
            mapOfNum: { one: 3520 },
            arrayOfNum: [3520]
        });

        state.num = undefined;
        delete state.mapOfNum['one'];
        state.arrayOfNum.pop();

        decodedState.decode(state.encode());

        assert.deepEqual(decodedState.toJSON(), {
            mapOfNum: {},
            arrayOfNum: []
        });
    });

    it("string: containing specific UTF-8 characters", () => {
        let bytes: number[];

        const state = new State();
        const decodedState = new State();

        state.fieldString = "гхб";
        bytes = state.encode();
        decodedState.decode(bytes);
        assert.equal("гхб", decodedState.fieldString);

        state.fieldString = "Пуредоминаце";
        bytes = state.encode();
        decodedState.decode(bytes);
        assert.equal("Пуредоминаце", decodedState.fieldString);

        state.fieldString = "未知の選手";
        bytes = state.encode();
        decodedState.decode(bytes);
        assert.equal("未知の選手", decodedState.fieldString);

        state.fieldString = "알 수없는 플레이어";
        bytes = state.encode();
        decodedState.decode(bytes);
        assert.equal("알 수없는 플레이어", decodedState.fieldString);
    });

    it("MapSchema: index with high number of items should be preserved", () => {
        const state = new State();
        state.mapOfPlayers = new MapSchema<Player>();

        let i = 0;

        // add 20 players
        // for (let i = 0; i < 2; i++) { state.mapOfPlayers[nanoid(8)] = new Player("Player " + i, i * 2, i * 2); }

        state.encodeAll();

        const decodedState1 = new State();
        decodedState1.decode(state.encodeAll());
        state.mapOfPlayers[nanoid(8)] = new Player("Player " + i++, i++, i++);

        const decodedState2 = new State();
        state.mapOfPlayers[nanoid(8)] = new Player("Player " + i++, i++, i++);
        decodedState2.decode(state.encodeAll());

        const decodedState3 = new State();
        decodedState3.decode(state.encodeAll());
        state.mapOfPlayers[nanoid(8)] = new Player("Player " + i++, i++, i++);

        // // add 20 players
        // for (let i = 0; i < 2; i++) { state.mapOfPlayers[nanoid(8)] = new Player("Player " + i, i * 2, i * 2); }

        const encoded = state.encode();
        decodedState1.decode(encoded);
        decodedState2.decode(encoded);
        decodedState3.decode(encoded);

        const decodedState4 = new State();
        state.mapOfPlayers[nanoid(8)] = new Player("Player " + i++, i++, i++);
        decodedState4.decode(state.encodeAll());

        assert.equal(JSON.stringify(decodedState1), JSON.stringify(decodedState2));
        assert.equal(JSON.stringify(decodedState2), JSON.stringify(decodedState3));

        decodedState3.decode(state.encode());
        assert.equal(JSON.stringify(decodedState3), JSON.stringify(decodedState4));
    });

    
    it("MapSchema: deep entities by index begining with non-zero number", () => {
        const idx1 = 'd';
        const idx2 = '7'; // has to start with a digit 1-9
        const state = new DeepState2();

        state.mapOfEntities = new MapSchema<Another>();

        const e1 = new Another(); 
        state.mapOfEntities[idx1] = e1;

        const e2 = new Another(); 
        state.mapOfEntities[idx2] = e2; 

        state.encodeAll();

        const state1 = new DeepState2();
        state1.decode(state.encodeAll());

        
        for (let i = 0; i < 100; i++) {
            state.mapOfEntities[idx2].position.x += 100;
            state.mapOfEntities[idx1].position.x -= 100;
            state1.decode(state.encode());
        }

        assert.equal(JSON.stringify(state1.mapOfEntities['d']), JSON.stringify(state.mapOfEntities['d']));
    });
});
