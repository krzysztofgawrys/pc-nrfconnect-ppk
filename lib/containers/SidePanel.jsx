/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, Button, ButtonGroup, Checkbox, FormControl, Glyphicon, InputGroup, Panel } from 'react-bootstrap';

import Slider from 'react-rangeslider';
import 'react-rangeslider/lib/index.css';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import UnitSelector from '../components/UnitSelector';

import {
    averageStart,
    averageStop,
    ppkUpdateRegulator,
    ppkTriggerUpdateWindow,
    ppkTriggerToggle,
    ppkTriggerSet,
    ppkTriggerSingleSet,
    ppkToggleDUT,
    updateResistors,
    resetResistors,
    externalTriggerToggled,
} from '../actions/PPKActions';

const SidePanel = props => (
    <div className="core-side-panel">
        <ButtonGroup block vertical>
            <Button
                bsStyle="primary"
                bsSize="large"
                disabled={!props.rttRunning}
                onClick={props.averageRunning ? props.averageStop : props.averageStart}
            >
                <Glyphicon glyph={props.averageRunning ? 'stop' : 'play'} />
                {props.averageRunning ? 'Stop' : 'Start'}
            </Button>
        </ButtonGroup>
        <ButtonGroup block vertical>
            <Button
                style={{ backgroundColor: 0xFF11AA }}
                bsSize="large"
                disabled={!props.rttRunning}
                onClick={() => props.ppkToggleDUT(props.deviceRunning)}
            >
                <Glyphicon glyph={props.deviceRunning ? 'remove-circle' : 'record'} />
                {props.deviceRunning ? 'Power OFF' : 'Power ON'}
            </Button>
        </ButtonGroup>
        <Accordion defaultActiveKey="1">
            <Panel header="Trigger" eventKey="1" /* defaultExpanded */>
                Window {props.triggerWindowLength} ms
                <Slider
                    disabled={!props.rttRunning}
                    min={(450 * 10) / 1e3}   // 450 bytes * sampling interval = 4.5 ms
                    max={(6000 * 10) / 1e3} // 6000 bytes * sampling interval = 60 ms
                    value={props.triggerWindowLength}
                    labels={{ 1: '4.5', 100: '60' }}
                    format={n => `${n}ms`}
                    onChange={props.moveTriggerWindowLength}
                    tooltip={false}
                    onChangeComplete={() => props.ppkTriggerUpdateWindow(props.triggerWindowLength)}
                />
                <ButtonGroup justified style={{ marginTop: 10 }}>
                    <Button
                        disabled={!props.rttRunning || props.externalTrigger}
                        bsSize="large"
                        style={{ width: '50%' }}
                        onClick={props.ppkTriggerSingleSet}
                    >
                        <Glyphicon glyph="time" />
                        {props.triggerSingleWaiting ? 'Waiting...' : 'Single'}
                    </Button>
                    <Button
                        disabled={!props.rttRunning || props.externalTrigger}
                        bsSize="large"
                        style={{ width: '50%' }}
                        onClick={props.ppkTriggerToggle}
                    >
                        <Glyphicon glyph={props.triggerRunning ? 'flash' : 'record'} />
                        {props.triggerRunning ? 'Stop' : 'Start'}
                    </Button>
                </ButtonGroup>
                <InputGroup style={{ marginTop: 10 }}>
                    <InputGroup.Addon>Trigger level</InputGroup.Addon>
                    <FormControl
                        disabled={!props.rttRunning || props.externalTrigger}
                        placeholder="3"
                        type="text"
                        onKeyPress={e => { if (e.key === 'Enter') { props.ppkTriggerSet(e.target.value, props.triggerUnit); } }}
                    />
                    <UnitSelector
                        disabled={!props.rttRunning || props.externalTrigger}
                        defaultSelected={1}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { props.triggerUnitChanged(['uA', 'mA'][i]); }}
                    />
                </InputGroup>
                <Checkbox
                    onClick={e => props.externalTriggerToggled(e.target.checked)}
                    checked={props.externalTrigger}
                >
                External trigger
                </Checkbox>
                {/* <Checkbox>trigger filter</Checkbox> */}
            </Panel>
        </Accordion>
        <Accordion>
            <Panel header="Voltage Regulator" eventKey="2" defaultExpanded>
                VDD {props.voltageRegulatorVdd} mV
                <Slider
                    min={1850}
                    max={3600}
                    value={props.voltageRegulatorVdd}
                    labels={{ 1850: '1850', 3600: '3600' }}
                    format={n => `${n}mV`}
                    onChange={props.moveVoltageRegulatorVdd}
                    tooltip={false}
                    onChangeComplete={() => props.ppkUpdateRegulator(props.voltageRegulatorVdd)}
                />
            </Panel>
            {/* <Panel header="Switching Groups" eventKey="3">
                Switch up
                <Slider
                    min={1}
                    max={100}
                    value={50}
                    labels={{ 1: '1', 100: '100' }}
                    format={n => `${n}mA`}
                    tooltip={false}
                    onChangeComplete={() => { console.log(props.triggerUnit); }}
                />
                Switch down
                <Slider
                    min={1}
                    max={100}
                    value={50}
                    labels={{ 1: '1', 100: '100' }}
                    format={n => `${n}mA`}
                    tooltip={false}
                    onChangeComplete={() => { console.log('foo'); }}
                />
                <Button block>Reset switching points</Button>
            </Panel> */}
            <Panel header="Resistor Calibration" eventKey="4">
                <InputGroup>
                    <InputGroup.Addon>High</InputGroup.Addon>
                    <FormControl
                        type="text"
                        value={props.resistorHigh}
                        onChange={e => props.updateHighResistor(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                    />
                </InputGroup>
                <InputGroup>
                    <InputGroup.Addon>Mid</InputGroup.Addon>
                    <FormControl
                        type="text"
                        value={props.resistorMid}
                        onChange={e => props.updateMidResistor(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                    />
                </InputGroup>
                <InputGroup>
                    <InputGroup.Addon>Low</InputGroup.Addon>
                    <FormControl
                        type="text"
                        value={props.resistorLow}
                        onChange={e => props.updateLowResistor(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                    />
                </InputGroup>
                <ButtonGroup justified style={{ marginTop: 10 }}>
                    <Button style={{ width: '50%' }} onClick={() => props.updateResistors()}>
                        <Glyphicon glyph="refresh" />Update
                    </Button>
                    <Button
                        style={{ width: '50%' }}
                        onClick={() => props.resetResistors()}
                    ><Glyphicon glyph="ban-circle" />Reset</Button>
                </ButtonGroup>
            </Panel>
        </Accordion>
    </div>
);

SidePanel.propTypes = {
    ppkUpdateRegulator: PropTypes.func.isRequired,

    averageStart: PropTypes.func.isRequired,
    averageStop: PropTypes.func.isRequired,
    averageRunning: PropTypes.bool.isRequired,
    externalTrigger: PropTypes.bool.isRequired,

    deviceRunning: PropTypes.bool.isRequired,
    rttRunning: PropTypes.bool.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
    triggerSingleWaiting: PropTypes.bool.isRequired,
    ppkToggleDUT: PropTypes.func.isRequired,

    ppkTriggerUpdateWindow: PropTypes.func.isRequired,
    ppkTriggerToggle: PropTypes.func.isRequired,

    triggerUnitChanged: PropTypes.func.isRequired,
    ppkTriggerSet: PropTypes.func.isRequired,
    ppkTriggerSingleSet: PropTypes.func.isRequired,
    triggerUnit: PropTypes.string.isRequired,


    triggerWindowLength: PropTypes.number.isRequired,
    moveTriggerWindowLength: PropTypes.func.isRequired,

    voltageRegulatorVdd: PropTypes.number.isRequired,
    moveVoltageRegulatorVdd: PropTypes.func.isRequired,

    resistorLow: PropTypes.number.isRequired,
    resistorMid: PropTypes.number.isRequired,
    resistorHigh: PropTypes.number.isRequired,
    // calibratedResistorLow: PropTypes.number.isRequired,
    // calibratedResistorMid: PropTypes.number.isRequired,
    // calibratedResistorHigh: PropTypes.number.isRequired,

    updateHighResistor: PropTypes.func.isRequired,
    updateMidResistor: PropTypes.func.isRequired,
    updateLowResistor: PropTypes.func.isRequired,
    updateResistors: PropTypes.func.isRequired,
    resetResistors: PropTypes.func.isRequired,
    externalTriggerToggled: PropTypes.func.isRequired,

};

export default connect(
    state => ({
        deviceRunning: state.app.app.deviceRunning,
        averageRunning: state.app.average.averageRunning,
        externalTrigger: state.app.trigger.externalTrigger,
        rttRunning: state.app.app.rttRunning,
        triggerRunning: state.app.trigger.triggerRunning,
        triggerSingleWaiting: state.app.trigger.triggerSingleWaiting,
        triggerWindowLength: state.app.trigger.windowLength,
        triggerUnit: state.app.trigger.triggerUnit,
        voltageRegulatorVdd: state.app.voltageRegulator.vdd,

        resistorLow: state.app.resistorCalibration.userResLo,
        resistorMid: state.app.resistorCalibration.userResMid,
        resistorHigh: state.app.resistorCalibration.userResHi,
    }),
    dispatch => Object.assign(
        {},
        bindActionCreators({
            averageStart,
            averageStop,
            ppkUpdateRegulator,
            ppkTriggerUpdateWindow,
            ppkTriggerToggle,
            ppkTriggerSet,
            ppkTriggerSingleSet,
            ppkToggleDUT,
            updateResistors,
            resetResistors,
            externalTriggerToggled,
        }, dispatch),
        {
            triggerUnitChanged: triggerUnit => dispatch({
                type: 'TRIGGER_WINDOW_UNIT_CHANGE',
                triggerUnit,
            }),
            moveTriggerWindowLength: windowLength => dispatch({
                type: 'TRIGGER_WINDOW_LENGTH_MOVE',
                windowLength,
            }),
            moveVoltageRegulatorVdd: vdd => {
                dispatch({
                    type: 'VOLTAGE_REGULATOR_VDD_MOVE',
                    vdd,
                });
            },
            updateHighResistor: userResHi => dispatch({
                type: 'USER_RESISTOR_UPDATED',
                userResHi,
            }),
            updateMidResistor: userResMid => dispatch({
                type: 'USER_RESISTOR_UPDATED',
                userResMid,
            }),
            updateLowResistor: userResLo => dispatch({
                type: 'USER_RESISTOR_UPDATED',
                userResLo,
            }),
        },
    ),
)(SidePanel);
