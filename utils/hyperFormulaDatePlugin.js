const { FunctionPlugin } = require('hyperformula');
const moment = require('moment');
const formulajs = require('@formulajs/formulajs');

function removeTime(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

class DatesCustomPlugin extends FunctionPlugin {
  format_date(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FORMAT_DATE'),
      (value, format) => {
        try {
          const dateValue = new Date(value);
          const output = moment(dateValue).format(format);
          if (!isNaN(output)) {
            return output * 1;
          }
          console.log('format_date', output);
          return output;
        } catch (error) {
          console.log('Error while formate_date', error.message);
        }

        return '';
      }
    );
  }

  get_day(ast, state) {
    return this.runFunction(ast.args, state, this.metadata('DAY'), (value) => {
      const output = new Date(value).getTime();
      console.log('get_day', output);
    });
  }

  get_today(ast, state) {
    return this.runFunction(ast.args, state, this.metadata('TODAY'), () => {
      const output = new Date().toString();
      console.log('get_today', output);
      return output;
    });
  }

  get_days(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('DAYS'),
      (start_date, end_date) => {
        start_date = isNaN(start_date)
          ? new Date(start_date).getTime()
          : start_date;
        end_date = isNaN(end_date) ? new Date(end_date).getTime() : end_date;
        // const output = formulajs.DAYS(start_date, end_date);
        const output = (start_date - end_date) / (1000 * 60 * 60 * 24);
        console.log('get_days', output, typeof output);
        return output;
      }
    );
  }

  get_text(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('DAYS'),
      (number, format) => {
        const output = formulajs.TEXT(number, format);
        console.log('get_text', output);
        return output;
      }
    );
  }

  get_date(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('DATE'),
      (year, month, day) => {
        const output = formulajs.DATE(year, month, day);
        console.log('get_date', output);
        return output;
      }
    );
  }

  get_workday(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('WORKDAY'),
      (to_date, from_date, holidays) => {
        const output = formulajs.WORKDAY(from_date, to_date, holidays);
        console.log('get_date', output);
        return output;
      }
    );
  }

  get_workdays(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('WORKDAYS'),
      (to_date, from_date, holidays) => {
        const output = formulajs.NETWORKDAYS(from_date, to_date, holidays);
        console.log('get_date', output);
        return output;
      }
    );
  }

  get_networkdays(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('WORKDAY'),
      (from_date, to_date, holidays) => {
        const output = formulajs.NETWORKDAYS(from_date, to_date, holidays);
        console.log('get_date', output);
        return output;
      }
    );
  }

  get_year(ast, state) {
    return this.runFunction(ast.args, state, this.metadata('YEAR'), (year) => {
      const output = formulajs.YEAR(year);
      return output;
    });
  }

  get_month(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('MONTH'),
      (month) => {
        const output = formulajs.MONTH(month);
        return output;
      }
    );
  }

  get_day(ast, state) {
    return this.runFunction(ast.args, state, this.metadata('DAY'), (day) => {
      const output = formulajs.DAY(day);
      return output;
    });
  }

  get_hour(ast, state) {
    return this.runFunction(ast.args, state, this.metadata('HOUR'), (hour) => {
      const output = formulajs.HOUR(hour);
      return output;
    });
  }

  get_minute(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('MINUTE'),
      (minute) => {
        const output = formulajs.MINUTE(minute);
        return output;
      }
    );
  }

  get_second(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('SECOND'),
      (second) => {
        const output = formulajs.SECOND(second);
        return output;
      }
    );
  }

  get_weeknum(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('WEEKNUM'),
      (date) => {
        const output = formulajs.WEEKNUM(date);
        return output;
      }
    );
  }

  get_isoweeknum(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('ISOWEEKNUM'),
      (date) => {
        const output = formulajs.ISOWEEKNUM(date);
        return output;
      }
    );
  }

  get_add_days(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('ADD_DAYS'),
      (date, num) => {
        const hasTime = date.includes(' ');
        const output = formulajs.WORKDAY(date, num);
        return hasTime ? output : removeTime(output);
      }
    );
  }

  get_subtract_days(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('SUBTRACT_DAYS'),
      (start_date, days) => {
        var sd = moment(new Date(start_date));
        var cd = sd.subtract(days, 'days');
        return cd.toDate();
      }
    );
  }

  get_add_minutes(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('SUBTRACT_MINUTES'),
      (start_date, minutes) => {
        var sd = moment(new Date(start_date));
        var cd = sd.add(minutes, 'minutes');
        return cd.toDate();
      }
    );
  }

  get_subtract_minutes(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('SUBTRACT_MINUTES'),
      (start_date, minutes) => {
        var sd = moment(new Date(start_date));
        var cd = sd.subtract(minutes, 'minutes');
        return cd.toDate();
      }
    );
  }

  get_hours_diff(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('HOURS_DIFF'),
      (h1, h2) => {
        var d1 = moment(h1, 'HH:mm');
        var d2 = moment(h2, 'HH:mm');
        var diff_hours = moment.utc(d1.diff(d2)).format('HH');
        var diff_minutes = moment.utc(d1.diff(d2)).format('mm');
        return diff_hours + ':' + diff_minutes;
      }
    );
  }

  conditionalIf(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('IF'),
      (cond, then_value, else_value, ...args) => {
        const output =
          args.length && args[0] > 0
            ? formulajs.IF(cond, then_value, else_value, ...args)
            : formulajs.IF(cond, then_value, else_value);
        return output;
      }
    );
  }

  concatenate(ast, state) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('CONCATENATE'),
      (...texts) => {
        const output = formulajs.CONCATENATE(...texts);
        console.log('CONCATENATE output', output);
        return output;
      }
    );
  }
}

DatesCustomPlugin.implementedFunctions = {
  FORMAT_DATE: {
    method: 'format_date',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'STRING' }],
  },
  DAY: {
    method: 'get_day',
    parameters: [{ argumentType: 'STRING' }],
  },
  TODAY: {
    method: 'get_today',
  },
  DAYS: {
    method: 'get_days',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  TEXT: {
    method: 'get_text',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  DATE: {
    method: 'get_date',
    parameters: [
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
    ],
  },
  WORKDAY: {
    method: 'get_workday',
    parameters: [
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY', optionalArg: true },
    ],
  },
  NETWORKDAYS: {
    method: 'get_networkdays',
    parameters: [
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY', optionalArg: true },
    ],
  },
  WORKDAYS: {
    method: 'get_workdays',
    parameters: [
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY', optionalArg: true },
    ],
  },
  YEAR: {
    method: 'get_year',
    parameters: [{ argumentType: 'ANY' }],
  },
  MONTH: {
    method: 'get_month',
    parameters: [{ argumentType: 'ANY' }],
  },
  DAY: {
    method: 'get_day',
    parameters: [{ argumentType: 'ANY' }],
  },
  HOUR: {
    method: 'get_hour',
    parameters: [{ argumentType: 'ANY' }],
  },
  MINUTE: {
    method: 'get_minute',
    parameters: [{ argumentType: 'ANY' }],
  },
  SECOND: {
    method: 'get_second',
    parameters: [{ argumentType: 'ANY' }],
  },
  WEEKNUM: {
    method: 'get_weeknum',
    parameters: [{ argumentType: 'ANY' }],
  },
  ISOWEEKNUM: {
    method: 'get_isoweeknum',
    parameters: [{ argumentType: 'ANY' }],
  },
  ADD_DAYS: {
    method: 'get_add_days',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  SUBTRACT_DAYS: {
    method: 'get_subtract_days',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  ADD_MINUTES: {
    method: 'get_add_minutes',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  SUBTRACT_MINUTES: {
    method: 'get_subtract_minutes',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  HOURS_DIFF: {
    method: 'get_hours_diff',
    parameters: [{ argumentType: 'ANY' }, { argumentType: 'ANY' }],
  },
  IF: {
    method: 'conditionalIf',
    parameters: [
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY' },
      { argumentType: 'ANY', optionalArg: true },
    ],
    repeatLastArgs: 1,
    expandRanges: true,
  },
  CONCATENATE: {
    method: 'concatenate',
    parameters: [
      {
        argumentType: 'ANY',
      },
    ],
    repeatLastArgs: 1,
    expandRanges: true,
  },
};

DatesCustomPlugin.translations = {
  enGB: {
    FORMAT_DATE: 'FORMAT_DATE',
    DAY: 'DAY',
    TODAY: 'TODAY',
    DAYS: 'DAYS',
    TEXT: 'TEXT',
    DATE: 'DATE',
    WORKDAY: 'WORKDAY',
    YEAR: 'YEAR',
    MONTH: 'MONTH',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    SECOND: 'SECOND',
    WEEKNUM: 'WEEKNUM',
    ADD_DAYS: 'ADD_DAYS',
    SUBTRACT_DAYS: 'SUBTRACT_DAYS',
    SUBTRACT_MINUTES: 'SUBTRACT_MINUTES',
    ADD_MINUTES: 'ADD_MINUTES',
    HOURS_DIFF: 'HOURS_DIFF',
    IF: 'IF',
    WORKDAYS: 'WORKDAYS',
  },
};

module.exports = DatesCustomPlugin;
