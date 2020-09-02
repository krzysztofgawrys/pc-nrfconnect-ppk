/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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

/* eslint no-param-reassign: off */

import colors from '../../colors.scss';

const CHART_SELECTION_COLOR = colors.gray50;
const CHART_DRAG_COLOR = colors.gray100;

export default {
    id: 'dragSelect',

    beforeInit(chartInstance) {
        const dragSelect = {};
        chartInstance.dragSelect = dragSelect;

        const { canvas } = chartInstance.chart.ctx;

        dragSelect.pointerDownHandler = event => {
            if (event.button === 0 && event.shiftKey) {
                dragSelect.dragStart = event;
            }
        };
        canvas.addEventListener('pointerdown', dragSelect.pointerDownHandler);

        dragSelect.pointerMoveHandler = event => {
            if (chartInstance.dragSelect.dragStart) {
                chartInstance.dragSelect.dragEnd = event;
                chartInstance.update({ lazy: true });
            }
        };
        canvas.addEventListener('pointermove', dragSelect.pointerMoveHandler);

        dragSelect.pointerUpHandler = event => {
            if (dragSelect.dragStart) {
                const { dragStart } = dragSelect;
                const offsetX = dragStart.target.getBoundingClientRect().left;
                const startX = Math.min(dragStart.clientX, event.clientX) - offsetX;
                const endX = Math.max(dragStart.clientX, event.clientX) - offsetX;

                if (endX > startX) {
                    const scale = chartInstance.scales.xScale;
                    const min = scale.getValueForPixel(startX).valueOf();
                    const max = scale.getValueForPixel(endX).valueOf();

                    if (dragSelect.callback) {
                        dragSelect.callback(min, max);
                    }
                    chartInstance.update({ lazy: true });
                }
                dragSelect.dragStart = null;
                dragSelect.dragEnd = null;
            }
        };
        canvas.addEventListener('pointerup', dragSelect.pointerUpHandler);
        canvas.addEventListener('pointerleave', dragSelect.pointerUpHandler);
    },

    beforeDraw(chartInstance) {
        const {
            chartArea: {
                left, right, top, bottom,
            },
            chart: { ctx },
            scales: { xScale: scale },
            dragSelect: { dragStart, dragEnd },
        } = chartInstance;
        const { cursor } = scale.options;

        if (typeof cursor.cursorBegin !== 'number' && !(dragStart && dragEnd)) {
            return;
        }

        ctx.save();

        if (typeof cursor.cursorBegin === 'number') {
            const { cursorBegin, cursorEnd } = cursor;
            const startX = Math.max(scale.getPixelForValue(cursorBegin).valueOf(), left);
            const endX = Math.min(scale.getPixelForValue(cursorEnd).valueOf(), right);
            ctx.fillStyle = CHART_SELECTION_COLOR;
            ctx.fillRect(startX, top, endX - startX, bottom - top);
        }

        if (dragStart && dragEnd) {
            const offsetX = dragStart.target.getBoundingClientRect().left;
            const startX = Math.max(Math.min(dragStart.clientX, dragEnd.clientX) - offsetX, left);
            const endX = Math.min(Math.max(dragStart.clientX, dragEnd.clientX) - offsetX, right);
            ctx.fillStyle = CHART_DRAG_COLOR;
            ctx.fillRect(startX, top, endX - startX, bottom - top);
        }
        ctx.restore();
    },
};
