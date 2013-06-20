/**
 * AUTHOR: mrassinger
 * COPYRIGHT: E2E Technologies Ltd.
 */

var bpmnProcessModule = require('../../../../lib/process.js');
var BPMNProcessDefinition = require('../../../../lib/parsing/processDefinition.js').BPMNProcessDefinition;
var BPMNCallActivity = require("../../../../lib/parsing/callActivity.js").BPMNCallActivity;
var BPMNStartEvent = require("../../../../lib/parsing/startEvents.js").BPMNStartEvent;
var BPMNEndEvent = require("../../../../lib/parsing/endEvents.js").BPMNEndEvent;
var BPMNSequenceFlow = require("../../../../lib/parsing/sequenceFlows.js").BPMNSequenceFlow;
var pathModule = require('path');

require("../../../../lib/history.js").setDummyTimestampFunction();

exports.testBPMNCallActivity = function(test) {
    var mainProcess;
    var bpmnCalledProcessFileName = pathModule.join(__dirname, "../../../resources/projects/simple/taskExampleProcess.bpmn");

    /** @type {BPMNProcessDefinition} */
    var processDefinition = new BPMNProcessDefinition("PROCESS_1", "MyProcess");
    processDefinition.addFlowObject(new BPMNStartEvent("_2", "MyStart", "startEvent"));
    processDefinition.addFlowObject(new BPMNCallActivity("_3", "MyCallActivity", "callActivity",
        "MyTaskExampleProcess", "http://sourceforge.net/parsing/definitions/_1363693864276", bpmnCalledProcessFileName));
    processDefinition.addFlowObject(new BPMNEndEvent("_5", "MyEnd", "endEvent"));
    processDefinition.addSequenceFlow(new BPMNSequenceFlow("_4", "flow1", "sequenceFlow", "_2", "_3"));
    processDefinition.addSequenceFlow(new BPMNSequenceFlow("_6", "flow2", "sequenceFlow", "_3", "_5"));

    var handler = {
        "MyStart": function(data, done) {
            done(data);
        },
        "MyCallActivity": { // calledProcess handler start here
            "MyStart": function(data, done) {
                var localState = this.getState();
                test.deepEqual(localState.tokens,
                    [
                        {
                            "position": "MyStart",
                            "owningProcessId": "mainPid1::MyCallActivity"
                        }
                    ],
                    "testBPMNCallActivity: local state at MyCallActivity"
                );
                done(data);
            },
            "MyTask": function(data, done) {
                var localState = this.getState();
                test.deepEqual(localState.tokens,
                    [
                        {
                            "position": "MyTask",
                            "owningProcessId": "mainPid1::MyCallActivity"
                        }
                    ],
                    "testBPMNCallActivity: local state at MyTask"
                );
                done(data);

                var mainState = mainProcess.getState();
                test.deepEqual(mainState.tokens,
                    [
                        {
                            "position": "MyCallActivity",
                            "substate": {
                                "tokens": [
                                    {
                                        "position": "MyTask",
                                        "owningProcessId": "mainPid1::MyCallActivity"
                                    }
                                ]
                            },
                            "owningProcessId": "mainPid1",
                            "calledProcessId": "mainPid1::MyCallActivity"
                        }
                    ],
                    "testBPMNCallActivity: main state at MyTask"
                );

                // we call taskDone for an activity of the CALLED process in the main process
                mainProcess.taskDone("MyTask");
            },
            "MyTaskDone": function(data, done) {
                var localState = this.getState();
                test.deepEqual(localState.tokens,
                    [
                        {
                            "position": "MyTask",
                            "owningProcessId": "mainPid1::MyCallActivity"
                        }
                    ],
                    "testBPMNCallActivity: local state at MyTaskDone"
                );
                done(data);
            },
            "MyEnd": function(data, done) {
                var state = this.getState();
                test.deepEqual(state.tokens,
                    [
                        {
                            "position": "MyEnd",
                            "owningProcessId": "mainPid1::MyCallActivity"
                        }
                    ],
                    "testBPMNCallActivity: state at MyEnd"
                );
                done(data);
            }
        },
        "MyCallActivityDone": function(data, done) {
            done(data);
        },
        "MyEnd": function(data, done) {
            var history = this.getHistory();
            test.deepEqual(history,
                {
                    "historyEntries": [
                        {
                            "name": "MyStart",
                            "begin": "_dummy_ts_",
                            "end": "_dummy_ts_"
                        },
                        {
                            "name": "MyCallActivity",
                            "begin": "_dummy_ts_",
                            "end": "_dummy_ts_",
                            "subhistory": {
                                "historyEntries": [
                                    {
                                        "name": "MyStart",
                                        "begin": "_dummy_ts_",
                                        "end": "_dummy_ts_"
                                    },
                                    {
                                        "name": "MyTask",
                                        "begin": "_dummy_ts_",
                                        "end": "_dummy_ts_"
                                    },
                                    {
                                        "name": "MyEnd",
                                        "begin": "_dummy_ts_",
                                        "end": "_dummy_ts_"
                                    }
                                ],
                                "createdAt": "_dummy_ts_"
                            }
                        },
                        {
                            "name": "MyEnd",
                            "begin": "_dummy_ts_",
                            "end": null // set after done()
                        }
                    ],
                    "createdAt": "_dummy_ts_"
                },
                "testBPMNCallActivity: history at MyEnd of main process"
            );
            done(data);
            test.done();
        }
    };

    mainProcess = bpmnProcessModule.createBPMNProcess4Testing("mainPid1", processDefinition, handler);

    mainProcess.triggerEvent("MyStart");

};