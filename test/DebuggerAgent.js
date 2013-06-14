var expect = require('chai').expect,
  launcher = require('./helpers/launcher.js'),
  DebuggerAgent = require('../lib/DebuggerAgent.js').DebuggerAgent;

describe('DebuggerAgent', function() {
  after(launcher.stopAllDebuggers);

  describe('sets variable value', function() {
    before(setupDebugScenario);

    toValueType(
      'a string',
      { value: 'string-value' },
      { type: 'string', value: 'string-value', description: 'string-value' }
    );

    toValueType(
      'a number',
      { value: 10 },
      { type: 'number', value: 10, description: '10' }
    );

    toValueType(
      'null',
      { value: null },
      { type: 'null', value: null, description: 'null' }
    );

    toValueType(
      'undefined',
      { },
      { type: 'undefined', description: 'undefined' }
    );

    toRefType(
      'an object',
      'console',
      function(valueId) {
        return {
          type: 'object',
          objectId: valueId,
          className: 'Object',
          description: 'Console'
        };
      }
    );

    toRefType(
      'a function',
      'console.log',
      function(valueId) {
        return {
          type: 'function',
          objectId: valueId,
          className: 'Function',
          description: 'function () { [native code] }'
        };
      }
    );

    // helpers (implementation details) below this line

    var debuggerClient, agent;

    function setupDebugScenario(done) {
      launcher.runOnBreakInFunction(function(client) {
        debuggerClient = client;
        agent = new DebuggerAgent({}, null, debuggerClient, null, null);
        done();
      });
    }

    function to(type, test) {
      it('to ' + type, test);
    }

    function toValueType(type, newValue, expectedResult) {
      to(type, function(done) {
        verifyVariableSetter(
          agent,
          newValue,
          expectedResult,
          done
        );
      });
    }

    function toRefType(type, newValueExpression, expectedResultCb) {
      to(type, function(done) {
        debuggerClient.fetchObjectId(agent, newValueExpression, function(valueId) {
          verifyVariableSetter(
            agent,
            { handle: valueId },
            expectedResultCb(valueId),
            done
          );
        });
      });
    }

    function verifyVariableSetter(agent, newValue, expectedResult, done) {
      agent.setVariableValue(
        {
          scopeNumber: '0',
          callFrameId: '0',
          variableName: 'meta',
          newValue: newValue
        },
        function(err, result) {
          if (process.version < 'v0.11.2') {
            expect(err)
              .to.have.string('does not support setting variable value');
            done();
            return;
          }

          if (err) throw err;

          verifyVariableValue(
            agent,
            'meta',
            expectedResult,
            done);
        }
      );
    }

    function verifyVariableValue(agent,
                                 name,
                                 expectedValue,
                                 callback) {
      agent.evaluateOnCallFrame(
        {
          callFrameId: 0,
          expression: name
        },
        function(err, result) {
          if (err) throw err;

          expect(JSON.stringify(result.result), name)
            .to.equal(JSON.stringify(expectedValue));
          callback();
        }
      );
    }
  });
});