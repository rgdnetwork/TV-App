#!/usr/bin/env ruby
# Servidor local para TV App. Solo escucha en 127.0.0.1.

require 'webrick'

ROOT = File.expand_path(File.dirname(__FILE__))
PORT = (ARGV[0] || 4173).to_i
URL = "http://127.0.0.1:#{PORT}/"

begin
  server = WEBrick::HTTPServer.new(
    Port: PORT,
    BindAddress: '127.0.0.1',
    DocumentRoot: ROOT,
    AccessLog: [],
    Logger: WEBrick::Log.new(File::NULL)
  )
rescue Errno::EADDRINUSE
  puts "El puerto #{PORT} ya esta en uso."
  puts "Abriendo #{URL} por si TV App ya esta en marcha..."
  system('open', URL)
  exit 0
end

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

Thread.new do
  sleep 1
  system('open', URL)
end

puts "TV App en marcha: #{URL}"
puts 'Deja esta ventana abierta mientras usas la app. Ctrl+C para cerrar.'
server.start
