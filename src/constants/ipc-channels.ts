export enum IpcChannels {
  DOWNLOAD_START = 'download:start',
  DOWNLOAD_PROGRESS = 'download:progress',
  DOWNLOAD_COMPLETE = 'download:complete',
  DOWNLOAD_ERROR = 'download:error',
  DOWNLOAD_LOG = 'download:log',

  // Requests from Renderer
  START_DOWNLOAD = 'request:start-download',
  CANCEL_DOWNLOAD = 'request:cancel-download',
  GET_SETTINGS = 'request:get-settings',
  SET_SETTINGS = 'request:set-settings',
  SELECT_FOLDER = 'request:select-folder',
  OPEN_EXTERNAL = 'request:open-external',
  CHECK_DEPENDENCIES = 'request:check-dependencies',
  GET_VIDEO_INFO = 'request:get-video-info',
}
