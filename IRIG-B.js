/* Protocol meta info:
<NAME> IRIG-B </NAME>
<DESCRIPTION>
IRIG time code B (IRIG-B) consists of frames that describe the time to
transfer timing information. One frame corresponds to one time, and
one frame consists of 100 bits. One bit is represented by the width of
one pulse.
</DESCRIPTION>
<VERSION> 0.0 </VERSION>
<AUTHOR_NAME> Yukio Yamamoto </AUTHOR_NAME>
<AUTHOR_URL> yukio@planeta.sci.isas.jaxa.jp </AUTHOR_URL>
<HELP_URL> https://github.com/ikalogic/ScanaStudio-scripts-v3/wiki </HELP_URL>
<COPYRIGHT> Copyright Yukio Yamamoto </COPYRIGHT>
<LICENSE> This code is distributed under the terms of the GNU General Public License GPLv3 </LICENSE>
<RELEASE_NOTES>
V0.0:  Initial release.
</RELEASE_NOTES>
*/

/* ----------------------------------------
 * Constants
 * ---------------------------------------- */
var MARKER_REF = 'R';
var MARKER_UNKNOWN = 'U';
var SPIKE_NOISE_PULSE_WIDTH_LIMIT = 0.1;
var GUI_DEC_STYLE_FRAME = 0;
var GUI_DEC_STYLE_PULSE = 1;

/* ----------------------------------------
 * Global Variables
 * ---------------------------------------- */
var channel;
var sampling_rate;
var flag_debug;
var flag_spike_removal;
var dec_style;
var logger = new Logger('IRIG-B');

/* ----------------------------------------
 * Functions
 * ---------------------------------------- */

/**
 * Pad a number with the given character until the resulting string reaches the given digit.
 * @param {Number} n The number 
 * @param {Number} digit the length of returned string with 
 * @param {String} c character to fill
 * @return {Number} the numeric string left filled with the given character
 */
function pad(n, digit, c) {
  c = c || '0';
  n = n + '';
  return n.length >= digit ? n : new Array(digit - n.length + 1).join(c) + n;
}

/**
 * Format datetime string in YYYY/mm/dd HH:MM:SS.fff
 * @param {Date} d datetime
 * @return {String} the datetime string in YYYY/mm/dd HH:MM:SS.fff format
 */
function datetime_format(d) {
  var yyyy = pad(d.getFullYear(), 4);
  var mm = pad(d.getMonth(), 2);
  var dd = pad(d.getDate(), 2);
  var HH = pad(d.getHours(), 2);
  var MM = pad(d.getMinutes(), 2);
  var SS = pad(d.getSeconds(), 2);
  var ms = pad(d.getMilliseconds(), 3);
  return yyyy + '/' + mm + '/' + dd + ' ' + HH + ':' + MM + ':' + SS + '.' + ms;
}

/**
 * Return the pulse width in the specified units.
 * For IRIG-B, it usually returns 5ms, 2ms, or 8ms.
 * @param {Numeric} start Start index
 * @param {Numeric} end End index
 * @param {Numeric} sampling_rate sampling rate 
 * @param {Numeric} unit unit
 * @return {Numeric} Return the pulse width in the given unit
 */
function get_pulse_width(start, end, sampling_rate, unit) {
  return Math.round((end - start) / sampling_rate / unit);
}

/**
 * Return the converted value following the pulse width.
 * For IRIG-B, 5ms is interpreted as 1, 2ms as 0, and 8ms as reference.
 * @param {Numeric} pulse_width 
 * @return {Numeric} return the converted value.
 */
function get_irig_value(pulse_width) {
  var value;
  switch (pulse_width) {
    case 5:
      value = 1;
      break;
    case 2:
      value = 0;
      break;
    case 8:
      value = MARKER_REF;
      break;
    default:
      value = MARKER_UNKNOWN;
  }
  return value;
}

/**
 * Verify the IRIG-B frame by checking the reference marker position.
 * @param {Array} frame 
 * @return {Boolean} false if the given frame does not follow IRIG-B format, otherwise true
 */
function check_frame(frame) {
  var ref_indexes = [0, 9, 19, 29, 39, 49, 59, 69, 79, 89, 99];
  for (var i = 0; i < ref_indexes.length; i++) {
    if (frame[ref_indexes[i]] != MARKER_REF) {
      return false;
    }
  }
  return true;
}

/**
 * Decode IRIG-B frame to time data.
 * @param {Array} frame 
 * @return {IrigTime} return decoded datetime information
 */
function decode_frame(frame) {
  var seconds;
  seconds = frame[1];
  seconds += frame[2] * 2;
  seconds += frame[3] * 4;
  seconds += frame[4] * 8;

  seconds += frame[6] * 10;
  seconds += frame[7] * 20;
  seconds += frame[8] * 40;

  var minutes;
  minutes = frame[10];
  minutes += frame[11] * 2;
  minutes += frame[12] * 4;
  minutes += frame[13] * 8;

  minutes += frame[15] * 10;
  minutes += frame[16] * 20;
  minutes += frame[17] * 40;

  var hours;
  hours = frame[20];
  hours += frame[21] * 2;
  hours += frame[22] * 4;
  hours += frame[23] * 8;

  hours += frame[25] * 10;
  hours += frame[26] * 20;

  var days;
  days = frame[30];
  days += frame[31] * 2;
  days += frame[32] * 4;
  days += frame[33] * 8;

  days += frame[35] * 10;
  days += frame[36] * 20;
  days += frame[37] * 40;
  days += frame[38] * 80;

  days += frame[40] * 100;
  days += frame[41] * 200;

  var year;
  year = frame[50];
  year += frame[51] * 2;
  year += frame[52] * 4;
  year += frame[53] * 8;

  year += frame[55] * 10;
  year += frame[56] * 20;
  year += frame[57] * 40;
  year += frame[58] * 80;

  var time_of_day;
  time_of_day = frame[80];
  time_of_day += frame[81] * 2;
  time_of_day += frame[82] * 4;
  time_of_day += frame[83] * 8;
  time_of_day += frame[84] * 16;
  time_of_day += frame[85] * 32;
  time_of_day += frame[86] * 64;
  time_of_day += frame[87] * 128;
  time_of_day += frame[88] * 256;

  time_of_day += frame[90] * 512;
  time_of_day += frame[91] * 1024;
  time_of_day += frame[92] * 2048;
  time_of_day += frame[93] * 4096;
  time_of_day += frame[94] * 8192;
  time_of_day += frame[95] * 16384;
  time_of_day += frame[96] * 32768;
  time_of_day += frame[97] * 65536;

  return new IrigTime(seconds, minutes, hours, days, year, time_of_day);
}

/* ----------------------------------------
 * Constructors
 * ---------------------------------------- */

function IrigTime(seconds, minutes, hours, days, year, time_of_day) {
  var self = {};

  self.seconds = seconds;
  self.minutes = minutes;
  self.hours = hours;
  self.days = days;
  self.year = year;
  self.time_of_day = time_of_day;

  self.to_hhmmss = function (d) {
    var seconds = pad(d.seconds, 2);
    var minutes = pad(d.minutes, 2);
    var hours = pad(d.hours, 2);
    return hours + ':' + minutes + ':' + seconds;
  }

  self.to_yyyydddhhmmss = function (d) {
    var time = self.to_hhmmss(d)
    var days = pad(d.days, 3);
    var year = pad(d.year, 4);
    return year + ' ' + days + ' ' + time;
  }

  return self;
}

function Logger(name) {
  var self = {};

  self.name = name;

  self.log = function (name, level, msg) {
    var now = new Date();
    var time = datetime_format(now);
    ScanaStudio.console_info_msg(time + ' [' + name + '] ' + level + ' ' + msg);
  }

  self.info = function (msg) { self.log(self.name, 'INFO', msg); };
  self.warning = function (msg) { self.log(self.name, 'WARN', msg); };
  self.error = function (msg) { self.log(self.name, 'ERROR', msg); };
  self.debug = function (msg) { self.log(self.name, 'DEBUG', msg); };

  return self;
}

function Frame() {
  var self = {};

  self.index = null;
  self.data = null;
  self.rising_edges = null;
  self.falling_edges = null;
  self.time = null;
  self.decoded = null;

  self.init = function () {
    self.index = 0;
    self.data = [];
    self.rising_edges = [];
    self.falling_edges = [];
  }

  self.push = function (value, rising_edge, falling_edge) {
    self.data.push(value);
    self.rising_edges.push(rising_edge);
    self.falling_edges.push(falling_edge);
    self.index++;
  }

  self.decode = function () {
    self.decoded = false;
    if (check_frame(self.data)) {
      self.time = decode_frame(self.data);
      self.decoded = true;
    }
    return self.decoded;
  }

  self.is_decoded = function () {
    return self.decoded;
  }

  self.get_time_string_long = function () {
    return self.time.to_yyyydddhhmmss(self.time);
  }

  self.get_time_string_short = function () {
    return self.time.to_hhmmss(self.time);
  }

  return self;
}

/* ----------------------------------------
 * GUI support functions
 * ---------------------------------------- */

function gui_add_dec_single_item(channel, f, start, end, items, error) {
  ScanaStudio.dec_item_new(channel, f.rising_edges[start], f.falling_edges[end]);
  for (var i = 0; i < items.length; i++) {
    ScanaStudio.dec_item_add_content(items[i]);
  }
  error = error || false;
  if (error) {
    ScanaStudio.dec_item_emphasize_error();
  }
  ScanaStudio.dec_item_end();
}

function gui_add_dec_items(channel, f, dec_style) {
  if (f.is_decoded()) {
    switch (dec_style) {
      case GUI_DEC_STYLE_FRAME:
        gui_add_dec_single_item(channel, f, 0, f.index - 1, [f.get_time_string_long(), f.get_time_string_short(), 'T'])
        break;
      case GUI_DEC_STYLE_PULSE:
        gui_add_dec_single_item(channel, f, 0, 0, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 1, 8, ['Seconds:' + f.time.seconds, 'SS', 'S']);
        gui_add_dec_single_item(channel, f, 9, 9, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 10, 18, ['Minutes: ' + f.time.minutes, 'MM', 'M']);
        gui_add_dec_single_item(channel, f, 19, 19, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 20, 26, ['Hours: ' + f.time.hours, 'HH', 'H']);
        gui_add_dec_single_item(channel, f, 29, 29, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 30, 41, ['Days: ' + f.time.days, 'DDD', 'D']);
        gui_add_dec_single_item(channel, f, 49, 49, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 50, 58, ['Year: ' + f.time.year, 'YYYY', 'Y']);
        gui_add_dec_single_item(channel, f, 59, 59, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 69, 69, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 79, 79, ['Reference', 'REF', 'R']);
        gui_add_dec_single_item(channel, f, 80, 98, ['Time of Day: ' + f.time.time_of_day, 'TOD', 'T']);
        gui_add_dec_single_item(channel, f, 99, 99, ['Reference', 'REF', 'R']);
    }
  } else {
    gui_add_dec_single_item(channel, f, 0, f.index - 1, ['Error Frame', 'Error', 'E'], true);
  }
}

function gui_add_packet_view(channel, f) {
  var COLOR = {
    ROOT_TITLE: ScanaStudio.get_channel_color(channel),
    ROOT_CONTENT: '#5050CC',
    SUB_TITLE: '#50AA50',
    SUB_CONTENT: '#F0FFF0',
    ROOT_TITLE_ERROR: '#AA0000',
    ROOT_CONTENT_ERROR: '#AA0000',
  };

  if (f.is_decoded()) {
    ScanaStudio.packet_view_add_packet(true, channel, f.rising_edges[0], f.falling_edges[f.index - 1], 'IRIG Frame', f.get_time_string_long(), COLOR.ROOT_TITLE, COLOR.ROOT_CONTENT);
  } else {
    ScanaStudio.packet_view_add_packet(true, channel, f.rising_edges[0], f.falling_edges[f.index - 1], 'IRIG Frame', 'ERROR', COLOR.ROOT_TITLE, COLOR.ROOT_CONTENT_ERROR);
  }

  for (var i = 0; i < f.data.length; i += 10) {
    var start = i;
    var end = i + 9;
    var title = start + ' - ' + end;
    ScanaStudio.packet_view_add_packet(false, channel, f.rising_edges[start], f.falling_edges[end], title, f.data.slice(start, end + 1), COLOR.SUB_TITLE, COLOR.SUB_CONTENT);
  }
}

function reload_dec_gui_values() {
  channel = ScanaStudio.gui_get_value('ch');
  dec_style = ScanaStudio.gui_get_value('dec_style');
  flag_spike_removal = ScanaStudio.gui_get_value('flag_spike_removal');
  flag_debug = ScanaStudio.gui_get_value('flag_debug');
}

/* ----------------------------------------
 * Event handlers
 * ---------------------------------------- */

function on_draw_gui_decoder() { // eslint-disable-line no-unused-vars
  ScanaStudio.gui_add_ch_selector('ch', 'Channel to analyze', 'IRIG-B');

  ScanaStudio.gui_add_combo_box('dec_style', 'Decorder Item Style');
  ScanaStudio.gui_add_item_to_combo_box('Frame', true);
  ScanaStudio.gui_add_item_to_combo_box('Pulse');

  ScanaStudio.gui_add_new_tab('Data Processing', true);
  ScanaStudio.gui_add_check_box('flag_spike_removal', 'Remove spike', true);
  ScanaStudio.gui_end_tab();

  ScanaStudio.gui_add_new_tab('Debug', true);
  ScanaStudio.gui_add_check_box('flag_debug', 'Show debug log on Script log', false);
  ScanaStudio.gui_end_tab();
}

function on_eval_gui_decoder() { // eslint-disable-line no-unused-vars
  ScanaStudio.set_script_instance_name('IRIG-B on CH' + (ScanaStudio.gui_get_value('ch') + 1).toString());
  return ''; //All good.
}

function on_decode_signals(resume) { // eslint-disable-line no-unused-vars
  var f;
  var prev_value = -1;
  var last_falling_edge = -1;
  var prev_falling_edge = -1;
  var last_rising_edge = -1;
  var prev_rising_edge = -1;
  var pulse_width = -1;
  var prev_pulse_width = -1;
  var total_decoded_frames = 0;

  if (!resume) { //Initialization
    logger.info('IRIG-B analyzer initialized');
    reload_dec_gui_values();
    ScanaStudio.trs_reset(channel);
    sampling_rate = ScanaStudio.get_capture_sample_rate();
    logger.info('Sampling rate: ' + sampling_rate / 1e6 + ' MHz');
    logger.info('Available samples: ' + ScanaStudio.get_available_samples(channel));
    f = new Frame();
    f.init();
  }

  while (ScanaStudio.abort_is_requested() == false) {
    if (!ScanaStudio.trs_is_not_last(channel)) {
      break;
    }
    var trs = ScanaStudio.trs_get_next(channel);

    if (prev_value == 0 && trs.value == 1) { // rising edge
      prev_rising_edge = last_rising_edge;
      last_rising_edge = trs.sample_index;
    } else if (prev_value == 1 && trs.value == 0) { // falling edge
      prev_falling_edge = last_falling_edge;
      last_falling_edge = trs.sample_index;

      prev_pulse_width = pulse_width;
      pulse_width = get_pulse_width(last_rising_edge, trs.sample_index, sampling_rate, 1e-3);

      // Remove spike
      if (flag_spike_removal) {
        if (pulse_width < SPIKE_NOISE_PULSE_WIDTH_LIMIT) {
          logger.info('Spike is found at ' + last_rising_edge + ' and ignored');
          last_rising_edge = prev_rising_edge;
          last_falling_edge = prev_falling_edge;
          continue;
        }
      }

      if (pulse_width == 8 && prev_pulse_width == 8) {
        if (f.index > 0) {
          if (f.decode()) {
            total_decoded_frames++;
            if (flag_debug) {
              logger.debug('sample_index: ' + f.rising_edges[0] + ' data: ' + f.data + ' decoded_time: ' + f.get_time_string_long());
            }
          } else {
            logger.error('sample_index: ' + f.rising_edges[0] + ' data: ' + f.data);
          }
          gui_add_dec_items(channel, f, dec_style);
          gui_add_packet_view(channel, f);
        }
        f.init();
      }

      f.push(get_irig_value(pulse_width), last_rising_edge, last_falling_edge);
    }
    prev_value = trs.value
  }
  logger.info('Total decoded frames: ' + total_decoded_frames);
}
