# Runs the Rails controller with a fixed clock, without Rails, and prints one JSON line.
# Called by ../check.ts with TICKETPING_IDENTITY_SECRET and TP_NOW set.

require "json"

begin
  require "jwt"
rescue LoadError
  puts({ example: "rails", skip: "Ruby gem not installed: jwt" }.to_json)
  exit
end

NOW = Integer(ENV.fetch("TP_NOW"))

class Time
  def self.now
    at(NOW)
  end
end

class Object
  def presence
    respond_to?(:empty?) && empty? ? nil : self
  end
end

class NilClass
  def presence
    nil
  end
end

class ApplicationController
  attr_reader :rendered

  def self.before_action(*); end

  def render(**options)
    @rendered = options
  end
end

User = Struct.new(:id, :email, :name)

require_relative "../rails/app/controllers/ticketping_tokens_controller"

controller = TicketpingTokensController.new
controller.define_singleton_method(:current_user) { User.new(123, "ada@acme.com", "Ada Lovelace") }
controller.create
puts({ example: "rails", status: 200, token: controller.rendered.fetch(:plain) }.to_json)
