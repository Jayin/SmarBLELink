module.exports = {
  VALIDATE_PARAMS: {
    name: 'VALIDATE_PARAMS',
    description: '正在检查参数',
    error: {
      code: -10000,
      msg: '参数错误'
    }
  },
  SCAN_BLE: {
    name: 'SCAN_BLE',
    description: '正在搜索BLE',
    error: {
      code: -10100,
      msg: '未搜索到BLE'
    }
  },
  CREATE_BLE_CONNECTION: {
    name: 'CREATE_BLE_CONNECTION',
    description: '正在连接BLE',
    error: {
      code: -10201,
      msg: '连接BLE失败'
    }
  },
  GET_BLE_DEVICE_SERVICES: {
    name: 'GET_BLE_DEVICE_SERVICES',
    description: '正在连接BLE',
    error: {
      code: -10202,
      msg: '连接BLE失败'
    }
  },
  GET_BLE_DEVICE_CHARACTERISTICS: {
    name: 'GET_BLE_DEVICE_CHARACTERISTICS',
    description: '正在连接BLE',
    error: {
      code: -10203,
      msg: '连接BLE失败'
    }
  },
  ENABLE_NOTIFY_BLE_CHARACTERISTIC: {
    name: 'ENABLE_NOTIFY_BLE_CHARACTERISTIC',
    description: '正在连接BLE',
    error: {
      code: -10204,
      msg: '连接BLE失败'
    }
  },
  CONFIG_BLE: {
    name: 'CONFIG_BLE',
    description: '正在配置BLE',
    error: {
      code: -10300,
      msg: '配置BLE失败'
    }
  },
  TASK_ALREADY_EXIST: {
    name: 'TASK_ALREADY_EXIST',
    description: '已有一个设备配置任务正在进行中',
    error: {
      code: -10400,
      msg: '已有一个设备配置任务正在进行中'
    }
  },
  CANCEL: {
    name: 'CANCEL',
    description: '已取消配置设备',
    error: {
      code: -10500,
      msg: '已取消配置设备'
    }
  }
}